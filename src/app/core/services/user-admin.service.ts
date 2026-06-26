import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, doc, serverTimestamp, setDoc } from '@angular/fire/firestore';
import { FirebaseApp, deleteApp, getApps, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, deleteUser, getAuth, signOut, UserCredential } from 'firebase/auth';
import { environment } from '../../../environments/environment';
import { ScreenAccessMap } from './user-access.service';

export interface WorkerDraftPayload {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  preferredLanguage: string;
  dateOfBirth: string;
  workerStatus?: string;
  areaType: 'field' | 'office';
  subRole: string;
  employmentType: 'W2' | '1099';
  active: boolean;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  ssnFull: string;
  workAuthorizationStatus: string;
  workAuthorizationExpiration: string;
  hireDate: string;
  rehireDate: string;
  supervisor: string;
  payType: string;
  hourlyRate: number | null;
  overtimeRate: number | null;
  paymentMethod: string;
  bankInfo: {
    bankName: string;
    accountType: string;
    routingNumber: string;
    accountNumber: string;
    accountHolderName: string;
  };
  w2Compliance: {
    payrollSetup: boolean;
    taxFormCompleted: boolean;
    i9Completed: boolean;
    eVerifyCompleted: boolean;
    eVerifyCaseNumber: string;
    eVerifyDate: string;
  };
  insuranceCompliance: {
    hasWorkersComp: boolean;
    workersCompPolicyNumber: string;
    workersCompExpiration: string;
    exemptionProvided: boolean;
    exemptionType: string;
    exemptionExpiration: string;
    hasLiabilityInsurance: boolean;
    liabilityPolicyNumber: string;
    liabilityExpiration: string;
    companyName: string;
    ein: string;
  };
  vacation: {
    policy: {
      enabled: boolean;
      ptoEligible: boolean;
      accrualMethod: string;
      annualDays: number | null;
      eligibilityMonths: number | null;
      allowCarryover: boolean;
      maxCarryoverDays: number | null;
    };
    balance: {
      grantedDays: number | null;
      usedDays: number | null;
      pendingDays: number | null;
      carryoverDays: number | null;
      sickDays: number | null;
      availableDays: number | null;
    };
    tracking: {
      eligibleFrom: string;
      lastGrantedAt: string;
      nextGrantAt: string;
      lastUsedAt: string;
      nextPlannedVacationDate: string;
      historyEntries: number | null;
    };
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  notes: string;
}

export interface CreateWorkerWithAccessPayload {
  worker: WorkerDraftPayload;
  canLogin: boolean;
  password?: string;
  role: string;
  screenAccess: ScreenAccessMap;
}

@Injectable({ providedIn: 'root' })
export class UserAdminService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  async createWorkerWithAccess(payload: CreateWorkerWithAccessPayload) {
    const currentAdmin = this.auth.currentUser;
    if (!currentAdmin?.uid) {
      throw new Error('You must be logged in as an admin to create workers.');
    }

    const normalizedWorker = this.normalizeWorker(payload.worker);
    const role = String(payload.role ?? '').trim().toLowerCase() || 'worker';
    const workerRef = doc(collection(this.firestore, 'workers'));
    const workerId = workerRef.id;

    let uid: string | null = null;
    let createdEmail: string | null = null;

    if (payload.canLogin) {
      const createdAuth = await this.createAuthUser({
        email: normalizedWorker.email,
        password: String(payload.password ?? ''),
        role,
        screenAccess: payload.screenAccess,
      });
      uid = createdAuth.uid;
      createdEmail = createdAuth.email;

      await setDoc(
        doc(this.firestore, 'users', uid),
        {
          uid,
          workerId,
          email: createdEmail,
          firstName: normalizedWorker.firstName,
          middleName: normalizedWorker.middleName,
          lastName: normalizedWorker.lastName,
          displayName: normalizedWorker.displayName,
          role,
          roles: role === 'admin' ? ['admin'] : [role],
          active: normalizedWorker.active,
          screenAccess: this.normalizeAccess(payload.screenAccess, role),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdByUid: currentAdmin.uid,
          createdByEmail: currentAdmin.email ?? null,
        },
        { merge: true }
      );
    }

    await setDoc(
      workerRef,
      {
        workerId,
        firstName: normalizedWorker.firstName,
        middleName: normalizedWorker.middleName,
        lastName: normalizedWorker.lastName,
        displayName: normalizedWorker.displayName,
        email: normalizedWorker.email,
        phone: normalizedWorker.phone,
        alternatePhone: normalizedWorker.alternatePhone,
        preferredLanguage: normalizedWorker.preferredLanguage,
        dateOfBirth: normalizedWorker.dateOfBirth || null,
        workerStatus: normalizedWorker.workerStatus,
        areaType: normalizedWorker.areaType,
        subRole: normalizedWorker.subRole,
        employmentType: normalizedWorker.employmentType,
        active: normalizedWorker.active,
        address: {
          line1: normalizedWorker.addressLine1,
          line2: normalizedWorker.addressLine2,
          city: normalizedWorker.city,
          state: normalizedWorker.state,
          zip: normalizedWorker.zip,
        },
        ssnFull: normalizedWorker.ssnFull,
        workAuthorization: {
          status: normalizedWorker.workAuthorizationStatus,
          expirationDate: normalizedWorker.workAuthorizationStatus === 'citizen' ? null : (normalizedWorker.workAuthorizationExpiration || null),
        },
        pay: {
          payType: normalizedWorker.payType,
          rate: normalizedWorker.hourlyRate,
          overtimeRate: normalizedWorker.overtimeRate,
          paymentMethod: normalizedWorker.paymentMethod,
          bankInfo: normalizedWorker.bankInfo,
        },
        employment: {
          type: normalizedWorker.employmentType,
          w2: normalizedWorker.w2Compliance,
          contractor1099: normalizedWorker.insuranceCompliance,
        },
        vacation: normalizedWorker.vacation,
        emergencyContact: normalizedWorker.emergencyContact,
        notes: normalizedWorker.notes,
        hireDate: normalizedWorker.hireDate || null,
        rehireDate: normalizedWorker.rehireDate || null,
        supervisor: normalizedWorker.supervisor,
        linkedAuthUid: uid,
        canLogin: payload.canLogin === true,
        accessRole: payload.canLogin ? role : 'worker',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdByUid: currentAdmin.uid,
        createdByEmail: currentAdmin.email ?? null,
      },
      { merge: true }
    );

    return {
      workerId,
      uid,
      email: createdEmail ?? normalizedWorker.email,
      role: payload.canLogin ? role : 'worker',
      canLogin: payload.canLogin === true,
    };
  }

  private normalizeWorker(worker: WorkerDraftPayload) {
    const firstName = String(worker.firstName ?? '').trim();
    const lastName = String(worker.lastName ?? '').trim();
    const email = String(worker.email ?? '').trim().toLowerCase();
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || email || 'Worker';

    return {
      firstName,
      middleName: String(worker.middleName ?? '').trim(),
      lastName,
      displayName,
      email,
      phone: String(worker.phone ?? '').trim(),
      alternatePhone: String(worker.alternatePhone ?? '').trim(),
      preferredLanguage: String(worker.preferredLanguage ?? '').trim() || 'english',
      dateOfBirth: String(worker.dateOfBirth ?? '').trim(),
      workerStatus: String(worker.workerStatus ?? '').trim() || (worker.active === true ? 'active' : 'inactive'),
      areaType: worker.areaType === 'office' ? 'office' : 'field',
      subRole: String(worker.subRole ?? '').trim().toLowerCase() || 'helper',
      employmentType: worker.employmentType === '1099' ? '1099' : 'W2',
      active: worker.active === true,
      addressLine1: String(worker.addressLine1 ?? '').trim(),
      addressLine2: String(worker.addressLine2 ?? '').trim(),
      city: String(worker.city ?? '').trim(),
      state: String(worker.state ?? '').trim().toUpperCase(),
      zip: String(worker.zip ?? '').trim(),
      ssnFull: String(worker.ssnFull ?? '').trim(),
      workAuthorizationStatus: String(worker.workAuthorizationStatus ?? '').trim().toLowerCase() || 'citizen',
      workAuthorizationExpiration: String(worker.workAuthorizationExpiration ?? '').trim(),
      hireDate: String(worker.hireDate ?? '').trim(),
      rehireDate: String(worker.rehireDate ?? '').trim(),
      supervisor: String(worker.supervisor ?? '').trim(),
      payType: String(worker.payType ?? 'hourly').trim() || 'hourly',
      hourlyRate: Number.isFinite(Number(worker.hourlyRate)) ? Number(worker.hourlyRate) : null,
      overtimeRate: Number.isFinite(Number(worker.overtimeRate)) ? Number(worker.overtimeRate) : null,
      paymentMethod: String(worker.paymentMethod ?? 'payroll').trim() || 'payroll',
      bankInfo: {
        bankName: String(worker.bankInfo?.bankName ?? '').trim(),
        accountType: String(worker.bankInfo?.accountType ?? 'checking').trim() || 'checking',
        routingNumber: String(worker.bankInfo?.routingNumber ?? '').trim(),
        accountNumber: String(worker.bankInfo?.accountNumber ?? '').trim(),
        accountHolderName: String(worker.bankInfo?.accountHolderName ?? '').trim(),
      },
      w2Compliance: {
        payrollSetup: worker.w2Compliance?.payrollSetup === true,
        taxFormCompleted: worker.w2Compliance?.taxFormCompleted === true,
        i9Completed: worker.w2Compliance?.i9Completed === true,
        eVerifyCompleted: worker.w2Compliance?.eVerifyCompleted === true,
        eVerifyCaseNumber: String(worker.w2Compliance?.eVerifyCaseNumber ?? '').trim(),
        eVerifyDate: String(worker.w2Compliance?.eVerifyDate ?? '').trim(),
      },
      insuranceCompliance: {
        hasWorkersComp: worker.insuranceCompliance?.hasWorkersComp === true,
        workersCompPolicyNumber: String(worker.insuranceCompliance?.workersCompPolicyNumber ?? '').trim(),
        workersCompExpiration: String(worker.insuranceCompliance?.workersCompExpiration ?? '').trim(),
        exemptionProvided: worker.insuranceCompliance?.exemptionProvided === true,
        exemptionType: String(worker.insuranceCompliance?.exemptionType ?? 'none').trim() || 'none',
        exemptionExpiration: String(worker.insuranceCompliance?.exemptionExpiration ?? '').trim(),
        hasLiabilityInsurance: worker.insuranceCompliance?.hasLiabilityInsurance === true,
        liabilityPolicyNumber: String(worker.insuranceCompliance?.liabilityPolicyNumber ?? '').trim(),
        liabilityExpiration: String(worker.insuranceCompliance?.liabilityExpiration ?? '').trim(),
        companyName: String(worker.insuranceCompliance?.companyName ?? '').trim(),
        ein: String(worker.insuranceCompliance?.ein ?? '').trim(),
      },
      vacation: {
        policy: {
          enabled: worker.vacation?.policy?.enabled === true,
          ptoEligible: worker.vacation?.policy?.ptoEligible === true,
          accrualMethod: String(worker.vacation?.policy?.accrualMethod ?? 'annual').trim() || 'annual',
          annualDays: Number.isFinite(Number(worker.vacation?.policy?.annualDays)) ? Number(worker.vacation?.policy?.annualDays) : null,
          eligibilityMonths: Number.isFinite(Number(worker.vacation?.policy?.eligibilityMonths)) ? Number(worker.vacation?.policy?.eligibilityMonths) : null,
          allowCarryover: worker.vacation?.policy?.allowCarryover === true,
          maxCarryoverDays: Number.isFinite(Number(worker.vacation?.policy?.maxCarryoverDays)) ? Number(worker.vacation?.policy?.maxCarryoverDays) : null,
        },
        balance: {
          grantedDays: Number.isFinite(Number(worker.vacation?.balance?.grantedDays)) ? Number(worker.vacation?.balance?.grantedDays) : null,
          usedDays: Number.isFinite(Number(worker.vacation?.balance?.usedDays)) ? Number(worker.vacation?.balance?.usedDays) : null,
          pendingDays: Number.isFinite(Number(worker.vacation?.balance?.pendingDays)) ? Number(worker.vacation?.balance?.pendingDays) : null,
          carryoverDays: Number.isFinite(Number(worker.vacation?.balance?.carryoverDays)) ? Number(worker.vacation?.balance?.carryoverDays) : null,
          sickDays: Number.isFinite(Number(worker.vacation?.balance?.sickDays)) ? Number(worker.vacation?.balance?.sickDays) : null,
          availableDays: Number.isFinite(Number(worker.vacation?.balance?.availableDays)) ? Number(worker.vacation?.balance?.availableDays) : null,
        },
        tracking: {
          eligibleFrom: String(worker.vacation?.tracking?.eligibleFrom ?? '').trim(),
          lastGrantedAt: String(worker.vacation?.tracking?.lastGrantedAt ?? '').trim(),
          nextGrantAt: String(worker.vacation?.tracking?.nextGrantAt ?? '').trim(),
          lastUsedAt: String(worker.vacation?.tracking?.lastUsedAt ?? '').trim(),
          nextPlannedVacationDate: String(worker.vacation?.tracking?.nextPlannedVacationDate ?? '').trim(),
          historyEntries: Number.isFinite(Number(worker.vacation?.tracking?.historyEntries)) ? Number(worker.vacation?.tracking?.historyEntries) : null,
        },
      },
      emergencyContact: {
        name: String(worker.emergencyContact?.name ?? '').trim(),
        relationship: String(worker.emergencyContact?.relationship ?? '').trim(),
        phone: String(worker.emergencyContact?.phone ?? '').trim(),
      },
      notes: String(worker.notes ?? '').trim(),
    };
  }

  private async createAuthUser(payload: { email: string; password: string; role: string; screenAccess: ScreenAccessMap }) {
    const email = String(payload.email ?? '').trim().toLowerCase();
    const password = String(payload.password ?? '');
    if (!email) throw new Error('Email is required when login is enabled.');
    if (!password) throw new Error('Password is required when login is enabled.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');

    const appName = `worktrace-user-admin-${Date.now()}`;
    let secondaryApp: FirebaseApp | null = null;
    let createdCredential: UserCredential | null = null;

    try {
      secondaryApp = this.createSecondaryApp(appName);
      const secondaryAuth = getAuth(secondaryApp);
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      createdCredential = cred;
      await signOut(secondaryAuth);
      return { uid: cred.user.uid, email, role: payload.role, screenAccess: payload.screenAccess };
    } catch (error: any) {
      if (createdCredential?.user) {
        try {
          await deleteUser(createdCredential.user);
        } catch {}
      }

      const code = String(error?.code ?? '');
      switch (code) {
        case 'auth/email-already-in-use':
          throw new Error('This email is already registered in Firebase Auth.');
        case 'auth/invalid-email':
          throw new Error('The email format is invalid.');
        case 'auth/weak-password':
          throw new Error('The password is too weak. Use at least 6 characters.');
        default:
          throw error instanceof Error ? error : new Error('Could not create the login user.');
      }
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch {}
      }
    }
  }

  private normalizeAccess(raw: Partial<ScreenAccessMap> | undefined, role?: string): ScreenAccessMap {
    const isAdmin = String(role ?? '').trim().toLowerCase() === 'admin';
    return {
      overview: isAdmin ? true : raw?.overview === true,
      construction: isAdmin ? true : raw?.construction === true,
      workers: isAdmin ? true : raw?.workers === true,
      humanResources: isAdmin ? true : raw?.humanResources === true,
      companies: isAdmin ? true : raw?.companies === true,
      settings: isAdmin ? true : raw?.settings === true,
      shop: isAdmin ? true : raw?.shop === true,
    };
  }

  private createSecondaryApp(appName: string): FirebaseApp {
    const existing = getApps().find((app) => app.name === appName);
    if (existing) return existing;
    return initializeApp(environment.firebase, appName);
  }
}
