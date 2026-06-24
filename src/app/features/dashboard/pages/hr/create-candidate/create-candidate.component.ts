
import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    ElementRef,
    ViewChild,
    inject,
    ChangeDetectionStrategy,
    effect,
    input,
    output
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Firestore, addDoc, collection, doc, getDocs, limit, query, serverTimestamp, updateDoc } from '@angular/fire/firestore';
import { Storage, getDownloadURL, ref, uploadBytes } from '@angular/fire/storage';
import { CandidateSearchDocument, CandidateSearchService } from '@app/services/candidate-search.service';
import { CandidateService } from '@app/services/candidate.service';
import { UserAccessService, ScreenAccessMap } from '@app/core/services/user-access.service';
import { CandidateSearchField } from '@app/models/candidateSearchField';

interface InsuranceComplianceView {
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
}

interface W2ComplianceView {
    payrollSetup: boolean;
    taxFormCompleted: boolean;
    i9Completed: boolean;
    eVerifyCompleted: boolean;
    eVerifyCaseNumber: string;
    eVerifyDate: string;
}

interface VacationView {
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
}


interface BankInfoView {
    bankName: string;
    accountType: string;
    routingNumber: string;
    accountNumber: string;
    accountHolderName: string;
}

interface CandidateDocumentView {
    type: string;
    label: string;
    files: File[];
    existingDocuments: CandidateSearchDocument[];
}

interface EmergencyContactView {
    name: string;
    relationship: string;
    phone: string;
}

interface PassportPhotoDraft {
    file: File | null;
    previewUrl: string;
    storagePath: string;
}

interface ManagedCandidateView {
    id: string;
    candidateId?: string;
    workerId: string;
    linkedAuthUid: string | null;
    canLogin: boolean;
    firstName: string;
    middleName: string;
    lastName: string;
    displayName: string;
    email: string;
    phone: string;
    alternatePhone: string;
    preferredLanguage: string;
    dateOfBirth: string;
    active: boolean;
    workerStatus: string;
    areaType: 'field' | 'office';
    subRole: string;
    employmentType: 'W2' | '1099';
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    zip: string;
    ssnFull: string;
    workAuthorizationStatus: string;
    workAuthorizationExpiration: string;
    passportNumber: string;
    residenceNumber: string;
    workPermitNumber: string;
    hireDate: string;
    rehireDate: string;
    supervisor: string;
    payType: string;
    hourlyRate: number | null;
    overtimeRate: number | null;
    paymentMethod: string;
    bankInfo: BankInfoView;
    role: string;
    screenAccess: ScreenAccessMap;
    w2Compliance: W2ComplianceView;
    insuranceCompliance: InsuranceComplianceView;
    vacation: VacationView;
    emergencyContact: EmergencyContactView;
    notes: string;
    photoURL: string;
    photoStoragePath: string;
    candidateStatus?: string;
    stage?: string;
    source?: string;
    convertedToWorkerId?: string | null;
}

type DraftCandidateView = Omit<ManagedCandidateView, 'hourlyRate' | 'overtimeRate'> & {
    hourlyRate: number | string | null;
    overtimeRate: number | string | null;
    password: string;
};

@Component({
    selector: 'app-create-candidate',
    imports: [
        FormsModule
    ],
    templateUrl: './create-candidate.component.html',
    styleUrl: './create-candidate.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateCandidateComponent {

    private readonly cdr = inject(ChangeDetectorRef);
    private readonly firestore = inject(Firestore);
    private readonly storage = inject(Storage);
    private readonly candidateSearchService = inject(CandidateSearchService);
    private readonly candidateService = inject(CandidateService);

    readonly selectedCandidate = input<ManagedCandidateView | null>(null);
    readonly candidateSaved = output<ManagedCandidateView>();
    private candidateDocumentLoadRequestId = 0;

    activeSection: 'identity' | 'employment' | 'compensation' | 'documents' | 'notes' = 'identity';
    @ViewChild('createCandidateScroll') createCandidateScroll?: ElementRef<HTMLElement>;
    isSaving = false;
    createMessage = '';
    createError = '';
    selectedCandidateRecord: ManagedCandidateView | null = null;
    saveCandidateMessage = '';
    saveCandidateError = '';
    isUpdatingCandidate = false;
    isLoadingCandidateDocuments = false;
    candidateDocumentsLoadError = '';

    readonly employmentOptions = ['W2', '1099'] as const;
    readonly areaOptions = ['field', 'office'] as const;
    readonly authorizationOptions = ['citizen', 'resident', 'work_permit', 'other'] as const;
    readonly payTypeOptions = ['hourly', 'salary', 'day_rate'] as const;
    readonly paymentMethodOptions = ['payroll', 'check', 'direct_deposit', '1099_invoice'] as const;
    readonly bankAccountTypeOptions = ['checking', 'savings'] as const;
    readonly documentUploadOptions = [
        { type: 'i9', label: 'I-9' },
        { type: 'w4', label: 'W-4' },
        { type: 'everify', label: 'E-Verify' },
        { type: 'direct_deposit', label: 'Direct Deposit Form' },
        { type: 'workers_comp', label: 'Workers Comp' },
        { type: 'exemption', label: 'Exemption' },
        { type: 'liability', label: 'Liability Insurance' },
        { type: 'other', label: 'Other HR Document' },
    ] as const;
    readonly languageOptions = ['english', 'spanish', 'bilingual', 'other'] as const;
    readonly vacationAccrualOptions = ['annual', 'manual', 'none'] as const;
    readonly exemptionOptions = ['none', 'construction_exemption', 'workers_comp_exemption', 'other'] as const;
    readonly fieldSubRoleOptions = ['foreman', 'mechanic', 'junior_mechanic', 'helper'] as const;
    readonly officeSubRoleOptions = ['secretary', 'estimator', 'project_manager', 'accounting', 'human_resources', 'director'] as const;

    draftCandidate = this.createEmptyDraft();
    draftDocuments = this.createDefaultDocumentDrafts();
    selectedCandidateDocuments = this.createDefaultDocumentDrafts();
    draftPhoto = this.createEmptyPhotoDraft();
    selectedCandidatePhoto = this.createEmptyPhotoDraft();

    constructor(public userAccess: UserAccessService) {
        effect(() => {
            const candidate = this.selectedCandidate();

            if (candidate) {
                this.editCandidate(candidate);
                this.cdr.markForCheck();
                return;
            }

            this.candidateDocumentLoadRequestId += 1;
            this.isLoadingCandidateDocuments = false;
            this.candidateDocumentsLoadError = '';
            this.selectedCandidateRecord = null;
            this.selectedCandidateDocuments = this.createDefaultDocumentDrafts();
            this.selectedCandidatePhoto = this.createEmptyPhotoDraft();
            this.draftCandidate = this.createEmptyDraft();
            this.draftDocuments = this.createDefaultDocumentDrafts();
            this.draftPhoto = this.createEmptyPhotoDraft();
            this.cdr.markForCheck();
        });
    }

    isEditingSelectedCandidate() {
        return this.selectedCandidate() !== null;
    }

    isCreateCandidateButtonDisabled(): boolean {
        return this.isEditingSelectedCandidate() ? this.isUpdatingCandidate : this.isSaving;
    }

    getCreateCandidateButtonLabel(): string {
        if (this.isEditingSelectedCandidate()) {
            return this.isUpdatingCandidate ? 'Saving...' : 'Save changes';
        }

        return this.isSaving ? 'Saving...' : 'Create candidate';
    }

    private refreshView() {
        this.cdr.detectChanges();
    }

    ngAfterViewInit(): void {
        setTimeout(() => this.refreshActiveSection(), 0);
    }

    scrollToSection(section: 'identity' | 'employment' | 'compensation' | 'documents' | 'notes') {
        this.activeSection = section;
        const el = document.getElementById(`hr-section-${section}`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    onCreateCandidateScroll(event: Event) {
        const container = event.target as HTMLElement | null;
        this.refreshActiveSection(container ?? undefined);
    }

    private refreshActiveSection(containerEl?: HTMLElement) {
        const container = containerEl ?? this.createCandidateScroll?.nativeElement;
        if (!container) return;

        const ids: Array<'identity' | 'employment' | 'compensation' | 'documents' | 'notes'> = [
            'identity',
            'employment',
            'compensation',
            'documents',
            'notes',
        ];

        const containerTop = container.getBoundingClientRect().top;
        let current: typeof ids[number] = ids[0];
        let best = Number.POSITIVE_INFINITY;

        for (const id of ids) {
            const el = document.getElementById(`hr-section-${id}`);
            if (!el) continue;
            const diff = Math.abs(el.getBoundingClientRect().top - containerTop - 18);
            if (diff < best) {
                best = diff;
                current = id;
            }
        }

        this.activeSection = current;
    }

    getSubRoleOptions(area: 'field' | 'office'): readonly string[] {
        return area === 'office' ? this.officeSubRoleOptions : this.fieldSubRoleOptions;
    }

    onDraftAreaChange() {
        const options = this.getSubRoleOptions(this.draftCandidate.areaType);
        if (!options.includes(this.draftCandidate.subRole as any)) {
            this.draftCandidate.subRole = options[0] ?? '';
        }
    }

    onSelectedAreaChange() {
        if (!this.selectedCandidateRecord) return;
        const options = this.getSubRoleOptions(this.selectedCandidateRecord.areaType);
        if (!options.includes(this.selectedCandidateRecord.subRole as any)) {
            this.selectedCandidateRecord.subRole = options[0] ?? '';
        }
    }

    onDraftEmploymentTypeChange() {
        if (this.draftCandidate.employmentType === '1099') {
            this.draftCandidate.payType = 'hourly';
            this.draftCandidate.overtimeRate = '';
            this.draftCandidate.w2Compliance = this.createDefaultW2Compliance();
            if (this.draftCandidate.paymentMethod === 'payroll') this.draftCandidate.paymentMethod = '1099_invoice';
        } else {
            this.updateDraftOvertimeRate();
        }
    }

    onSelectedEmploymentTypeChange() {
        if (!this.selectedCandidateRecord) return;
        if (this.selectedCandidateRecord.employmentType === '1099') {
            this.selectedCandidateRecord.payType = 'hourly';
            this.selectedCandidateRecord.overtimeRate = null;
            this.selectedCandidateRecord.w2Compliance = this.createDefaultW2Compliance();
            if (this.selectedCandidateRecord.paymentMethod === 'payroll') this.selectedCandidateRecord.paymentMethod = '1099_invoice';
        } else {
            this.updateSelectedOvertimeRate();
        }
    }

    updateDraftOvertimeRate() {
        const base = this.toNumberOrNull(this.draftCandidate.hourlyRate);
        this.draftCandidate.overtimeRate = this.draftCandidate.employmentType === 'W2' && base !== null ? Number((base * 1.5).toFixed(2)) : '';
    }

    updateSelectedOvertimeRate() {
        if (!this.selectedCandidateRecord) return;
        const base = this.toNumberOrNull(this.selectedCandidateRecord.hourlyRate);
        this.selectedCandidateRecord.overtimeRate = this.selectedCandidateRecord.employmentType === 'W2' && base !== null ? Number((base * 1.5).toFixed(2)) : null;
    }

    onDraftPaymentMethodChange() {
        if (this.draftCandidate.paymentMethod !== 'direct_deposit') {
            this.draftCandidate.bankInfo = this.createDefaultBankInfo();
        }
    }

    onSelectedPaymentMethodChange() {
        if (!this.selectedCandidateRecord) return;
        if (this.selectedCandidateRecord.paymentMethod !== 'direct_deposit') {
            this.selectedCandidateRecord.bankInfo = this.createDefaultBankInfo();
        }
    }

    onDraftFilesSelected(docType: string, event: Event) {
        const input = event.target as HTMLInputElement;
        const files = Array.from(input.files ?? []);
        const target = this.draftDocuments.find((item) => item.type === docType);
        if (target) target.files = files;
    }

    onSelectedFilesSelected(docType: string, event: Event) {
        const input = event.target as HTMLInputElement;
        const files = Array.from(input.files ?? []);
        const target = this.selectedCandidateDocuments.find((item) => item.type === docType);
        if (target) target.files = files;
    }

    onDraftPhotoSelected(event: Event) {
        this.applyPhotoSelection(event, this.draftPhoto, this.draftCandidate);
    }

    onSelectedCandidatePhotoSelected(event: Event) {
        this.applyPhotoSelection(event, this.selectedCandidatePhoto, this.selectedCandidateRecord);
    }

    clearDraftPhoto() {
        this.clearPhotoDraft(this.draftPhoto, this.draftCandidate);
    }

    clearSelectedCandidatePhoto() {
        this.clearPhotoDraft(this.selectedCandidatePhoto, this.selectedCandidateRecord);
    }

    getPhotoPreview(photoUrl: string | null | undefined, photoDraft?: PassportPhotoDraft | null): string {
        return photoDraft?.previewUrl || String(photoUrl ?? '').trim() || '';
    }

    getCandidateInitials(firstName?: string | null, lastName?: string | null): string {
        const first = String(firstName ?? '').trim();
        const last = String(lastName ?? '').trim();
        return `${first.charAt(0)}${last.charAt(0)}`.trim().toUpperCase() || 'WT';
    }

    private applyPhotoSelection(event: Event, target: PassportPhotoDraft, candidateRef?: { photoURL?: string; photoStoragePath?: string } | null) {
        const input = event.target as HTMLInputElement | null;
        const file = input?.files?.[0] ?? null;
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.createError = 'Candidate photo must be an image file.';
            if (input) input.value = '';
            return;
        }

        const maxBytes = 4 * 1024 * 1024;
        if (file.size > maxBytes) {
            this.createError = 'Candidate photo must be 4 MB or smaller.';
            if (input) input.value = '';
            return;
        }

        target.file = file;
        target.previewUrl = URL.createObjectURL(file);
        target.storagePath = '';
        if (candidateRef) {
            candidateRef.photoURL = '';
            candidateRef.photoStoragePath = '';
        }
        if (input) input.value = '';
    }

    private clearPhotoDraft(target: PassportPhotoDraft, candidateRef?: { photoURL?: string; photoStoragePath?: string } | null) {
        if (target.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(target.previewUrl);
        }
        target.file = null;
        target.previewUrl = '';
        target.storagePath = '';
        if (candidateRef) {
            candidateRef.photoURL = '';
            candidateRef.photoStoragePath = '';
        }
    }

    isDraftW2(): boolean {
        return String(this.draftCandidate.employmentType ?? 'W2').trim().toUpperCase() === 'W2';
    }

    isDraft1099(): boolean {
        return String(this.draftCandidate.employmentType ?? 'W2').trim().toUpperCase() === '1099';
    }

    isDraftDirectDeposit(): boolean {
        return String(this.draftCandidate.paymentMethod ?? '').trim().toLowerCase() === 'direct_deposit';
    }

    private getDocumentDraftFiles(documentDrafts: CandidateDocumentView[], type: string): File[] {
        return documentDrafts.find((item) => item.type === type)?.files ?? [];
    }

    private hasDocumentDraftFiles(documentDrafts: CandidateDocumentView[], type: string): boolean {
        return this.getDocumentDraftFiles(documentDrafts, type).length > 0;
    }

    private validateRequiredCreateFields(candidate: ManagedCandidateView | DraftCandidateView, documentDrafts: CandidateDocumentView[]) {
        const employmentType = String(candidate?.employmentType ?? 'W2').trim().toUpperCase();
        const payType = String(candidate?.payType ?? '').trim().toLowerCase();
        const paymentMethod = String(candidate?.paymentMethod ?? '').trim().toLowerCase();

        const missing: string[] = [];

        const requireText = (value: any, label: string) => {
            if (!String(value ?? '').trim()) missing.push(label);
        };

        const requireNumber = (value: any, label: string) => {
            if (this.toNumberOrNull(value) === null) missing.push(label);
        };

        const requireDoc = (type: string, label: string) => {
            if (!this.hasDocumentDraftFiles(documentDrafts, type)) missing.push(label);
        };

        requireText(candidate?.firstName, 'First name');
        requireText(candidate?.lastName, 'Last name');
        requireText(candidate?.employmentType, 'Employment type');
        requireText(candidate?.payType, 'Pay type');

        if (['hourly', 'salary', 'day_rate'].includes(payType)) {
            requireNumber(candidate?.hourlyRate, payType === 'salary' ? 'Salary / regular rate' : 'Regular rate');
        }

        if (paymentMethod === 'direct_deposit') {
            requireText(candidate?.bankInfo?.bankName, 'Bank name');
            requireText(candidate?.bankInfo?.accountHolderName, 'Account holder name');
            requireText(candidate?.bankInfo?.routingNumber, 'Routing number');
            requireText(candidate?.bankInfo?.accountNumber, 'Account number');
            requireDoc('direct_deposit', 'Direct Deposit Form document');
        }

        if (employmentType === 'W2') {
            requireText(candidate?.w2Compliance?.eVerifyCaseNumber, 'E-Verify case number');
            requireText(candidate?.w2Compliance?.eVerifyDate, 'E-Verify date');
            requireDoc('i9', 'I-9 document');
            requireDoc('w4', 'W-4 document');
            requireDoc('everify', 'E-Verify document');
        }

        if (employmentType === '1099') {
            requireText(candidate?.insuranceCompliance?.companyName, '1099 company name');
            requireText(candidate?.insuranceCompliance?.ein, 'EIN');

            const hasWorkersComp = candidate?.insuranceCompliance?.hasWorkersComp === true;
            const hasExemption = candidate?.insuranceCompliance?.exemptionProvided === true;

            if (!hasWorkersComp && !hasExemption) {
                missing.push('Workers Comp on file or Exemption provided');
            }

            if (hasWorkersComp) {
                requireText(candidate?.insuranceCompliance?.workersCompPolicyNumber, 'Workers Comp policy #');
                requireText(candidate?.insuranceCompliance?.workersCompExpiration, 'Workers Comp expiration');
                requireDoc('workers_comp', 'Workers Comp document');
            }

            if (hasExemption) {
                requireText(candidate?.insuranceCompliance?.exemptionType, 'Exemption type');
                requireText(candidate?.insuranceCompliance?.exemptionExpiration, 'Exemption expiration');
                requireDoc('exemption', 'Exemption document');
            }

            if (candidate?.insuranceCompliance?.hasLiabilityInsurance === true) {
                requireText(candidate?.insuranceCompliance?.liabilityPolicyNumber, 'Liability policy #');
                requireText(candidate?.insuranceCompliance?.liabilityExpiration, 'Liability expiration');
                requireDoc('liability', 'Liability Insurance document');
            }
        }

        if (missing.length) {
            throw new Error(`Please complete the required Create Candidate fields: ${missing.join(', ')}.`);
        }
    }


    editCandidate(candidate: ManagedCandidateView) {
        const requestId = ++this.candidateDocumentLoadRequestId;

        this.saveCandidateMessage = '';
        this.saveCandidateError = '';
        this.candidateDocumentsLoadError = '';
        this.selectedCandidateRecord = {
            ...candidate,
            screenAccess: { ...candidate.screenAccess },
            w2Compliance: this.cloneW2Compliance(candidate.w2Compliance),
            insuranceCompliance: { ...candidate.insuranceCompliance },
            vacation: this.cloneVacation(candidate.vacation, candidate.hireDate),
            bankInfo: this.cloneBankInfo(candidate.bankInfo),
        };
        this.selectedCandidateDocuments = this.createDefaultDocumentDrafts();
        this.draftDocuments = this.createDefaultDocumentDrafts();
        this.selectedCandidatePhoto = {
            file: null,
            previewUrl: candidate.photoURL || '',
            storagePath: candidate.photoStoragePath || '',
        };
        this.draftCandidate = {
            ...this.selectedCandidateRecord,
            hourlyRate: this.selectedCandidateRecord.hourlyRate ?? '',
            overtimeRate: this.selectedCandidateRecord.overtimeRate ?? '',
            password: '',
        };
        this.draftPhoto = this.selectedCandidatePhoto;
        this.isLoadingCandidateDocuments = true;
        this.refreshView();
        void this.loadCandidateDocumentsForEdit(candidate.id, requestId);
    }

    closeEditor() {
        this.selectedCandidateRecord = null;
        this.selectedCandidateDocuments = this.createDefaultDocumentDrafts();
        this.selectedCandidatePhoto = this.createEmptyPhotoDraft();
        this.saveCandidateError = '';

        if (this.isEditingSelectedCandidate()) {
            const selectedCandidate = this.selectedCandidate();
            if (selectedCandidate) {
                this.editCandidate(selectedCandidate);
            }
            return;
        }

        this.resetDraft();
    }

    toggleDraftScreen(key: keyof ScreenAccessMap) {
        this.draftCandidate.screenAccess[key] = !this.draftCandidate.screenAccess[key];
    }

    toggleSelectedScreen(key: keyof ScreenAccessMap) {
        if (!this.selectedCandidateRecord) return;
        this.selectedCandidateRecord.screenAccess[key] = !this.selectedCandidateRecord.screenAccess[key];
    }

    refreshDraftVacation() {
        this.draftCandidate.vacation = this.cloneVacation(this.draftCandidate.vacation, this.draftCandidate.hireDate);
    }

    refreshSelectedVacation() {
        if (!this.selectedCandidateRecord) return;
        this.selectedCandidateRecord.vacation = this.cloneVacation(this.selectedCandidateRecord.vacation, this.selectedCandidateRecord.hireDate);
    }

    async createCandidate() {
        if (this.isEditingSelectedCandidate()) {
            await this.saveCandidateChanges();
            return;
        }

        if (this.isSaving) return;

        this.createMessage = '';
        this.createError = '';

        try {
            this.draftCandidate.w2Compliance = this.cloneW2Compliance(this.draftCandidate.w2Compliance);
            this.validateCandidateCompliance(this.draftCandidate);
            this.validateRequiredCreateFields(this.draftCandidate, this.draftDocuments);

            const firstName = String(this.draftCandidate.firstName ?? '').trim();
            const middleName = String(this.draftCandidate.middleName ?? '').trim();
            const lastName = String(this.draftCandidate.lastName ?? '').trim();
            const email = String(this.draftCandidate.email ?? '').trim().toLowerCase();

            if (!firstName || !lastName) {
                throw new Error('First name and last name are required.');
            }

            const displayName = [firstName, middleName, lastName].filter(Boolean).join(' ') || email || 'Candidate';
            const candidateBasePayload = {
                candidateId: '',
                firstName,
                middleName,
                lastName,
                displayName,
                email,
                phone: String(this.draftCandidate.phone ?? '').trim(),
                alternatePhone: String(this.draftCandidate.alternatePhone ?? '').trim(),
                preferredLanguage: String(this.draftCandidate.preferredLanguage ?? '').trim() || 'english',
                dateOfBirth: String(this.draftCandidate.dateOfBirth ?? '').trim() || null,
                candidateStatus: 'new',
                stage: 'new',
                source: 'manual',
                areaType: this.draftCandidate.areaType === 'office' ? 'office' : 'field',
                subRole: String(this.draftCandidate.subRole ?? '').trim().toLowerCase() || 'helper',
                employmentType: this.draftCandidate.employmentType === '1099' ? '1099' : 'W2',
                address: {
                    line1: String(this.draftCandidate.addressLine1 ?? '').trim(),
                    line2: String(this.draftCandidate.addressLine2 ?? '').trim(),
                    city: String(this.draftCandidate.city ?? '').trim(),
                    state: String(this.draftCandidate.state ?? '').trim().toUpperCase(),
                    zip: String(this.draftCandidate.zip ?? '').trim(),
                },
                ssnFull: String(this.draftCandidate.ssnFull ?? '').trim(),
                workAuthorization: {
                    status: String(this.draftCandidate.workAuthorizationStatus ?? '').trim().toLowerCase() || 'citizen',
                    expirationDate:
                        String(this.draftCandidate.workAuthorizationStatus ?? '').trim().toLowerCase() === 'citizen'
                            ? null
                            : (String(this.draftCandidate.workAuthorizationExpiration ?? '').trim() || null),
                },
                pay: {
                    payType: String(this.draftCandidate.payType ?? 'hourly').trim() || 'hourly',
                    rate: this.toNumberOrNull(this.draftCandidate.hourlyRate),
                    overtimeRate: this.toNumberOrNull(this.draftCandidate.overtimeRate),
                    paymentMethod: String(this.draftCandidate.paymentMethod ?? '').trim() || 'payroll',
                    bankInfo: this.cloneBankInfo(this.draftCandidate.bankInfo),
                },
                employment: {
                    type: this.draftCandidate.employmentType === '1099' ? '1099' : 'W2',
                    w2: this.cloneW2Compliance(this.draftCandidate.w2Compliance),
                    contractor1099: this.cloneInsuranceCompliance(this.draftCandidate.insuranceCompliance),
                },
                vacation: this.cloneVacation(this.draftCandidate.vacation, this.draftCandidate.hireDate),
                emergencyContact: this.cloneEmergencyContact(this.draftCandidate.emergencyContact),
                notes: String(this.draftCandidate.notes ?? '').trim(),
                hireDate: String(this.draftCandidate.hireDate ?? '').trim() || null,
                rehireDate: String(this.draftCandidate.rehireDate ?? '').trim() || null,
                supervisor: String(this.draftCandidate.supervisor ?? '').trim(),
                passportNumber: String(this.draftCandidate.passportNumber ?? '').trim(),
                residenceNumber: String(this.draftCandidate.residenceNumber ?? '').trim(),
                workPermitNumber: String(this.draftCandidate.workPermitNumber ?? '').trim(),
                convertedToWorkerId: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const candidateSearchFields: CandidateSearchField[] = [
                { field: 'firstName', value: candidateBasePayload.firstName },
                { field: 'middleName', value: candidateBasePayload.middleName },
                { field: 'lastName', value: candidateBasePayload.lastName },
                { field: 'displayName', value: candidateBasePayload.displayName },
                { field: 'email', value: candidateBasePayload.email },
                { field: 'phone', value: candidateBasePayload.phone },
                { field: 'status', value: candidateBasePayload.candidateStatus },
                { field: 'stage', value: candidateBasePayload.stage },
                { field: 'source', value: candidateBasePayload.source },
                { field: 'areaType', value: candidateBasePayload.areaType },
                { field: 'subRole', value: candidateBasePayload.subRole },
                { field: 'supervisor', value: candidateBasePayload.supervisor },
                { field: 'employmentType', value: candidateBasePayload.employmentType },
            ];

            const candidatePayload = {
                ...candidateBasePayload,
                searchSubstringsByField: this.candidateService.buildStringFieldSubstrings(candidateSearchFields),
            };
            this.isSaving = true;
            this.refreshView();
            const { candidatesCollection, payload } = await this.ensureCandidatesCollectionReady(candidatePayload);
            const candidateRef = await addDoc(candidatesCollection, payload);
            await updateDoc(doc(this.firestore, 'candidates', candidateRef.id), { candidateId: candidateRef.id });

            const photoPatch = await this.uploadCandidatePassportPhoto(candidateRef.id, firstName, lastName, this.draftPhoto);
            if (photoPatch) {
                await updateDoc(doc(this.firestore, 'candidates', candidateRef.id), photoPatch);
            }

            await this.uploadCandidateDocuments(candidateRef.id, this.draftDocuments);

            this.createMessage = `Candidate created: ${displayName}`;
            this.resetDraft();
            this.refreshView();
        } catch (error: any) {
            this.createMessage = '';
            this.createError = error?.message || 'Could not create candidate.';
            this.refreshView();
        } finally {
            this.isSaving = false;
            this.refreshView();
        }
    }

    async saveCandidateChanges() {
        if (!this.selectedCandidateRecord?.id || this.isUpdatingCandidate) return;

        this.isUpdatingCandidate = true;
        this.saveCandidateMessage = '';
        this.saveCandidateError = '';
        this.refreshView();

        try {
            this.draftCandidate.w2Compliance = this.cloneW2Compliance(this.draftCandidate.w2Compliance);
            this.validateCandidateCompliance(this.draftCandidate);
            const candidate = this.draftCandidate;
            const candidateId = this.selectedCandidateRecord.id;
            const firstName = String(candidate.firstName ?? '').trim();
            const lastName = String(candidate.lastName ?? '').trim();
            const middleName = String(candidate.middleName ?? '').trim();
            const displayName = [firstName, middleName, lastName].filter(Boolean).join(' ') || candidate.email || candidateId;
            const email = String(candidate.email ?? '').trim().toLowerCase();
            const candidateStatus = String((this.selectedCandidateRecord.candidateStatus ?? candidate.candidateStatus ?? 'new')).trim() || 'new';
            const stage = String((this.selectedCandidateRecord.stage ?? candidate.stage ?? 'new')).trim() || 'new';
            const source = String((this.selectedCandidateRecord.source ?? candidate.source ?? 'manual')).trim() || 'manual';
            const convertedToWorkerId = this.selectedCandidateRecord.convertedToWorkerId ?? candidate.convertedToWorkerId ?? null;

            const candidateBaseUpdate = {
                candidateId,
                firstName,
                middleName,
                lastName,
                displayName,
                email,
                phone: String(candidate.phone ?? '').trim(),
                alternatePhone: String(candidate.alternatePhone ?? '').trim(),
                preferredLanguage: String(candidate.preferredLanguage ?? '').trim() || 'english',
                dateOfBirth: String(candidate.dateOfBirth ?? '').trim() || null,
                candidateStatus,
                stage,
                source,
                areaType: candidate.areaType === 'office' ? 'office' : 'field',
                subRole: String(candidate.subRole ?? '').trim().toLowerCase() || 'helper',
                employmentType: candidate.employmentType === '1099' ? '1099' : 'W2',
                address: {
                    line1: String(candidate.addressLine1 ?? '').trim(),
                    line2: String(candidate.addressLine2 ?? '').trim(),
                    city: String(candidate.city ?? '').trim(),
                    state: String(candidate.state ?? '').trim().toUpperCase(),
                    zip: String(candidate.zip ?? '').trim(),
                },
                ssnFull: String(candidate.ssnFull ?? '').trim(),
                workAuthorization: {
                    status: String(candidate.workAuthorizationStatus ?? '').trim().toLowerCase() || 'citizen',
                    expirationDate: String(candidate.workAuthorizationStatus ?? '').trim().toLowerCase() === 'citizen' ? null : (String(candidate.workAuthorizationExpiration ?? '').trim() || null),
                },
                pay: {
                    payType: String(candidate.payType ?? 'hourly').trim() || 'hourly',
                    rate: this.toNumberOrNull(candidate.hourlyRate),
                    overtimeRate: this.toNumberOrNull(candidate.overtimeRate),
                    paymentMethod: String(candidate.paymentMethod ?? '').trim() || 'payroll',
                    bankInfo: this.cloneBankInfo(candidate.bankInfo),
                },
                employment: {
                    type: candidate.employmentType === '1099' ? '1099' : 'W2',
                    w2: this.cloneW2Compliance(candidate.w2Compliance),
                    contractor1099: this.cloneInsuranceCompliance(candidate.insuranceCompliance),
                },
                vacation: this.cloneVacation(candidate.vacation, candidate.hireDate),
                emergencyContact: this.cloneEmergencyContact(candidate.emergencyContact),
                notes: String(candidate.notes ?? '').trim(),
                hireDate: String(candidate.hireDate ?? '').trim() || null,
                rehireDate: String(candidate.rehireDate ?? '').trim() || null,
                supervisor: String(candidate.supervisor ?? '').trim(),
                passportNumber: String(candidate.passportNumber ?? '').trim(),
                residenceNumber: String(candidate.residenceNumber ?? '').trim(),
                workPermitNumber: String(candidate.workPermitNumber ?? '').trim(),
                convertedToWorkerId,
                updatedAt: serverTimestamp(),
            };

            const candidateSearchFields: CandidateSearchField[] = [
                { field: 'firstName', value: candidateBaseUpdate.firstName },
                { field: 'middleName', value: candidateBaseUpdate.middleName },
                { field: 'lastName', value: candidateBaseUpdate.lastName },
                { field: 'displayName', value: candidateBaseUpdate.displayName },
                { field: 'email', value: candidateBaseUpdate.email },
                { field: 'phone', value: candidateBaseUpdate.phone },
                { field: 'status', value: candidateBaseUpdate.candidateStatus },
                { field: 'stage', value: candidateBaseUpdate.stage },
                { field: 'source', value: candidateBaseUpdate.source },
                { field: 'areaType', value: candidateBaseUpdate.areaType },
                { field: 'subRole', value: candidateBaseUpdate.subRole },
                { field: 'supervisor', value: candidateBaseUpdate.supervisor },
                { field: 'employmentType', value: candidateBaseUpdate.employmentType },
            ];

            const candidateUpdate = {
                ...candidateBaseUpdate,
                searchSubstringsByField: this.candidateService.buildStringFieldSubstrings(candidateSearchFields),
            };
            await updateDoc(doc(this.firestore, 'candidates', candidateId), candidateUpdate);

            const photoPatch = await this.uploadCandidatePassportPhoto(candidateId, firstName, lastName, this.draftPhoto);
            if (photoPatch) {
                await updateDoc(doc(this.firestore, 'candidates', candidateId), photoPatch);
                this.draftCandidate.photoURL = photoPatch.photoURL;
                this.draftCandidate.photoStoragePath = photoPatch.photoStoragePath;
            }

            const uploadedDocuments = await this.uploadCandidateDocuments(candidateId, this.draftDocuments);
            this.draftDocuments = this.mergeUploadedDocuments(this.draftDocuments, uploadedDocuments);
            this.selectedCandidateDocuments = this.draftDocuments;
            this.saveCandidateMessage = `Candidate updated: ${displayName}`;

            const updatedCandidate: ManagedCandidateView = {
                ...this.selectedCandidateRecord,
                ...candidate,
                id: candidateId,
                candidateId,
                workerId: this.selectedCandidateRecord.workerId,
                linkedAuthUid: this.selectedCandidateRecord.linkedAuthUid,
                displayName,
                email,
                candidateStatus,
                stage,
                source,
                convertedToWorkerId,
                w2Compliance: this.cloneW2Compliance(candidate.w2Compliance),
                hourlyRate: this.toNumberOrNull(candidate.hourlyRate),
                overtimeRate: this.toNumberOrNull(candidate.overtimeRate),
                photoURL: photoPatch?.photoURL ?? candidate.photoURL,
                photoStoragePath: photoPatch?.photoStoragePath ?? candidate.photoStoragePath,
            };
            this.selectedCandidateRecord = updatedCandidate;
            this.draftCandidate = {
                ...updatedCandidate,
                hourlyRate: updatedCandidate.hourlyRate ?? '',
                overtimeRate: updatedCandidate.overtimeRate ?? '',
                password: '',
            };
            this.candidateSaved.emit(updatedCandidate);
            this.refreshView();

            if (!this.isEditingSelectedCandidate()) {
                this.selectedCandidateRecord = null;
            }
        } catch (error: any) {
            this.saveCandidateError = error?.message || 'Could not save candidate changes.';
            this.refreshView();
        } finally {
            this.isUpdatingCandidate = false;
            this.refreshView();
        }
    }

    resetDraft() {
        if (this.isEditingSelectedCandidate()) {
            const selectedCandidate = this.selectedCandidate();
            if (selectedCandidate) {
                this.editCandidate(selectedCandidate);
            }
            return;
        }

        this.clearPhotoDraft(this.draftPhoto);
        this.draftPhoto = this.createEmptyPhotoDraft();
        this.draftCandidate = this.createEmptyDraft();
        this.draftDocuments = this.createDefaultDocumentDrafts();
    }

    closeMenus() { }

    getComplianceSummary(candidate: ManagedCandidateView | DraftCandidateView | null | undefined): string {
        if (!candidate) return 'Not set';
        if (candidate.employmentType === '1099') {
            const parts: string[] = [];
            if (candidate.insuranceCompliance?.hasWorkersComp) parts.push('Workers Comp');
            if (candidate.insuranceCompliance?.exemptionProvided) parts.push('Exemption');
            if (candidate.insuranceCompliance?.hasLiabilityInsurance) parts.push('Liability');
            return parts.length ? parts.join(' · ') : '1099 compliance missing';
        }

        const w2 = candidate.w2Compliance || {};
        const done = [w2.taxFormCompleted, w2.i9Completed, w2.eVerifyCompleted, w2.payrollSetup].filter(Boolean).length;
        return `W2 onboarding ${done}/4`;
    }

    private validateCandidateCompliance(candidate: ManagedCandidateView | DraftCandidateView) {
        const employmentType = String(candidate?.employmentType ?? 'W2').trim().toUpperCase();
        if (employmentType === '1099') {
            const insurance = candidate?.insuranceCompliance;
            const hasWorkersComp = insurance?.hasWorkersComp === true;
            const hasExemption = insurance?.exemptionProvided === true;
            if (!hasWorkersComp && !hasExemption) {
                throw new Error('A 1099 candidate must have Workers Comp or an exemption on file.');
            }
        }
    }

    private createEmptyDraft(): DraftCandidateView {
        return {
            id: '',
            candidateId: '',
            workerId: '',
            linkedAuthUid: null,
            firstName: '',
            middleName: '',
            lastName: '',
            displayName: '',
            email: '',
            phone: '',
            alternatePhone: '',
            preferredLanguage: 'english',
            dateOfBirth: '',
            areaType: 'field' as 'field' | 'office',
            subRole: 'helper',
            employmentType: 'W2' as 'W2' | '1099',
            active: true,
            workerStatus: 'active',
            addressLine1: '',
            addressLine2: '',
            city: '',
            state: 'FL',
            zip: '',
            ssnFull: '',
            workAuthorizationStatus: 'citizen',
            workAuthorizationExpiration: '',
            passportNumber: '',
            residenceNumber: '',
            workPermitNumber: '',
            hireDate: '',
            rehireDate: '',
            supervisor: '',
            payType: 'hourly',
            hourlyRate: '' as number | string,
            overtimeRate: '' as number | string,
            paymentMethod: 'payroll',
            bankInfo: this.createDefaultBankInfo(),
            w2Compliance: this.createDefaultW2Compliance(),
            insuranceCompliance: this.createDefaultInsuranceCompliance(),
            vacation: this.createDefaultVacation(),
            emergencyContact: this.createDefaultEmergencyContact(),
            notes: '',
            photoURL: '',
            photoStoragePath: '',
            candidateStatus: 'new',
            stage: 'new',
            source: 'manual',
            convertedToWorkerId: null,
            canLogin: false,
            password: '',
            role: 'candidate',
            screenAccess: {
                overview: true,
                construction: false,
                workers: false,
                humanResources: false,
                companies: false,
                settings: false,
            },
        };
    }

    private createEmptyPhotoDraft(): PassportPhotoDraft {
        return {
            file: null,
            previewUrl: '',
            storagePath: '',
        };
    }

    private sanitizeFileSegment(value: string): string {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'candidate';
    }

    private buildStorageFileName(fileName: string): string {
        const trimmedName = String(fileName ?? '').trim();
        const extension = (trimmedName.split('.').pop() || '').toLowerCase();
        const rawBaseName = extension ? trimmedName.slice(0, -(extension.length + 1)) : trimmedName;
        const baseName = this.sanitizeFileSegment(rawBaseName || 'file');
        return extension ? `${baseName}.${extension}` : baseName;
    }

    private async uploadCandidatePassportPhoto(
        candidateId: string,
        firstName: string,
        lastName: string,
        photoDraft: PassportPhotoDraft,
    ): Promise<{ photoURL: string; photoStoragePath: string } | null> {
        if (!photoDraft.file) {
            return photoDraft.previewUrl && photoDraft.storagePath
                ? { photoURL: photoDraft.previewUrl, photoStoragePath: photoDraft.storagePath }
                : null;
        }

        const extension = (photoDraft.file.name.split('.').pop() || 'jpg').toLowerCase();
        const safeName = `${this.sanitizeFileSegment(lastName)}-${this.sanitizeFileSegment(firstName) || 'candidate'}`;
        const storagePath = `candidates/${candidateId}/passport-photo/${safeName}.${extension}`;
        const storageRef = ref(this.storage, storagePath);

        await uploadBytes(storageRef, photoDraft.file, {
            contentType: photoDraft.file.type || 'image/jpeg',
            customMetadata: {
                candidateId,
                category: 'passport-photo',
            },
        });

        const photoURL = await getDownloadURL(storageRef);

        if (photoDraft.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(photoDraft.previewUrl);
        }

        photoDraft.file = null;
        photoDraft.previewUrl = photoURL;
        photoDraft.storagePath = storagePath;

        return { photoURL, photoStoragePath: storagePath };
    }

    private async loadCandidateDocumentsForEdit(candidateId: string, requestId: number) {
        try {
            const documents = await this.candidateSearchService.loadCandidateDocuments(candidateId);
            if (requestId !== this.candidateDocumentLoadRequestId) {
                return;
            }

            this.selectedCandidateDocuments = this.applyExistingDocuments(this.createDefaultDocumentDrafts(), documents);
            this.draftDocuments = this.applyExistingDocuments(this.createDefaultDocumentDrafts(), documents);
        } catch (error: unknown) {
            if (requestId === this.candidateDocumentLoadRequestId) {
                this.candidateDocumentsLoadError = error instanceof Error ? error.message : 'Could not load candidate documents.';
            }
        } finally {
            if (requestId === this.candidateDocumentLoadRequestId) {
                this.isLoadingCandidateDocuments = false;
                this.refreshView();
            }
        }
    }

    private async uploadCandidateDocuments(candidateId: string, docs: CandidateDocumentView[]): Promise<CandidateSearchDocument[]> {
        const hasFiles = docs.some((docItem) => Array.isArray(docItem.files) && docItem.files.length > 0);
        if (!hasFiles) return [];

        const candidateDocPath = collection(this.firestore, 'candidates', candidateId, 'documents');
        const uploadedDocuments: CandidateSearchDocument[] = [];

        for (const docItem of docs) {
            for (const file of docItem.files ?? []) {
                const timestamp = Date.now();
                const safeFileName = this.buildStorageFileName(file.name);
                const storagePath = `candidates/${candidateId}/documents/${docItem.type}/${timestamp}-${safeFileName}`;
                const storageRef = ref(this.storage, storagePath);

                await uploadBytes(storageRef, file, {
                    contentType: file.type || 'application/octet-stream',
                    customMetadata: {
                        candidateId,
                        documentType: docItem.type,
                    },
                });

                const fileUrl = await getDownloadURL(storageRef);

                await addDoc(candidateDocPath, {
                    type: docItem.type,
                    label: docItem.label,
                    fileName: file.name,
                    storagePath,
                    fileUrl,
                    mimeType: file.type || null,
                    size: Number.isFinite(file.size) ? file.size : null,
                    uploadedAt: serverTimestamp(),
                });

                uploadedDocuments.push({
                    type: docItem.type,
                    label: docItem.label,
                    fileName: file.name,
                    storagePath,
                    fileUrl,
                    mimeType: file.type || 'application/octet-stream',
                });
            }
        }

        return uploadedDocuments;
    }

    private createDefaultBankInfo(): BankInfoView {
        return {
            bankName: '',
            accountType: 'checking',
            routingNumber: '',
            accountNumber: '',
            accountHolderName: '',
        };
    }

    private cloneBankInfo(value: Partial<BankInfoView> | null | undefined): BankInfoView {
        return {
            bankName: String(value?.bankName ?? '').trim(),
            accountType: String(value?.accountType ?? 'checking').trim() || 'checking',
            routingNumber: String(value?.routingNumber ?? '').trim(),
            accountNumber: String(value?.accountNumber ?? '').trim(),
            accountHolderName: String(value?.accountHolderName ?? '').trim(),
        };
    }

    private createDefaultW2Compliance(): W2ComplianceView {
        return {
            payrollSetup: false,
            taxFormCompleted: false,
            i9Completed: false,
            eVerifyCompleted: false,
            eVerifyCaseNumber: '',
            eVerifyDate: '',
        };
    }

    private cloneW2Compliance(value: Partial<W2ComplianceView> | null | undefined): W2ComplianceView {
        return {
            payrollSetup: value?.payrollSetup === true,
            taxFormCompleted: value?.taxFormCompleted === true,
            i9Completed: value?.i9Completed === true,
            eVerifyCompleted: value?.eVerifyCompleted === true,
            eVerifyCaseNumber: String(value?.eVerifyCaseNumber ?? '').trim(),
            eVerifyDate: String(value?.eVerifyDate ?? '').trim(),
        };
    }

    private createDefaultInsuranceCompliance(): InsuranceComplianceView {
        return {
            hasWorkersComp: false,
            workersCompPolicyNumber: '',
            workersCompExpiration: '',
            exemptionProvided: false,
            exemptionType: 'none',
            exemptionExpiration: '',
            hasLiabilityInsurance: false,
            liabilityPolicyNumber: '',
            liabilityExpiration: '',
            companyName: '',
            ein: '',
        };
    }

    private cloneInsuranceCompliance(value: Partial<InsuranceComplianceView> | null | undefined): InsuranceComplianceView {
        return {
            hasWorkersComp: value?.hasWorkersComp === true,
            workersCompPolicyNumber: String(value?.workersCompPolicyNumber ?? '').trim(),
            workersCompExpiration: String(value?.workersCompExpiration ?? '').trim(),
            exemptionProvided: value?.exemptionProvided === true,
            exemptionType: String(value?.exemptionType ?? 'none').trim() || 'none',
            exemptionExpiration: String(value?.exemptionExpiration ?? '').trim(),
            hasLiabilityInsurance: value?.hasLiabilityInsurance === true,
            liabilityPolicyNumber: String(value?.liabilityPolicyNumber ?? '').trim(),
            liabilityExpiration: String(value?.liabilityExpiration ?? '').trim(),
            companyName: String(value?.companyName ?? '').trim(),
            ein: String(value?.ein ?? '').trim(),
        };
    }

    private createDefaultEmergencyContact(): EmergencyContactView {
        return {
            name: '',
            relationship: '',
            phone: '',
        };
    }

    private cloneEmergencyContact(value: Partial<EmergencyContactView> | null | undefined): EmergencyContactView {
        return {
            name: String(value?.name ?? '').trim(),
            relationship: String(value?.relationship ?? '').trim(),
            phone: String(value?.phone ?? '').trim(),
        };
    }

    private createDefaultVacation(): VacationView {
        return {
            policy: {
                enabled: false,
                ptoEligible: false,
                accrualMethod: 'annual',
                annualDays: null,
                eligibilityMonths: 12,
                allowCarryover: false,
                maxCarryoverDays: null,
            },
            balance: {
                grantedDays: null,
                usedDays: null,
                pendingDays: null,
                carryoverDays: null,
                sickDays: null,
                availableDays: null,
            },
            tracking: {
                eligibleFrom: '',
                lastGrantedAt: '',
                nextGrantAt: '',
                lastUsedAt: '',
                nextPlannedVacationDate: '',
                historyEntries: null,
            },
        };
    }

    private cloneVacation(value: Partial<VacationView> | null | undefined, hireDate?: string | null): VacationView {
        const base = this.createDefaultVacation();
        return {
            policy: {
                enabled: value?.policy?.enabled === true,
                ptoEligible: value?.policy?.ptoEligible === true,
                accrualMethod: String(value?.policy?.accrualMethod ?? base.policy.accrualMethod).trim() || base.policy.accrualMethod,
                annualDays: this.toNumberOrNull(value?.policy?.annualDays),
                eligibilityMonths: this.toNumberOrNull(value?.policy?.eligibilityMonths) ?? base.policy.eligibilityMonths,
                allowCarryover: value?.policy?.allowCarryover === true,
                maxCarryoverDays: this.toNumberOrNull(value?.policy?.maxCarryoverDays),
            },
            balance: {
                grantedDays: this.toNumberOrNull(value?.balance?.grantedDays),
                usedDays: this.toNumberOrNull(value?.balance?.usedDays),
                pendingDays: this.toNumberOrNull(value?.balance?.pendingDays),
                carryoverDays: this.toNumberOrNull(value?.balance?.carryoverDays),
                sickDays: this.toNumberOrNull(value?.balance?.sickDays),
                availableDays: this.toNumberOrNull(value?.balance?.availableDays),
            },
            tracking: {
                eligibleFrom: String(value?.tracking?.eligibleFrom ?? hireDate ?? '').trim(),
                lastGrantedAt: String(value?.tracking?.lastGrantedAt ?? '').trim(),
                nextGrantAt: String(value?.tracking?.nextGrantAt ?? '').trim(),
                lastUsedAt: String(value?.tracking?.lastUsedAt ?? '').trim(),
                nextPlannedVacationDate: String(value?.tracking?.nextPlannedVacationDate ?? '').trim(),
                historyEntries: this.toNumberOrNull(value?.tracking?.historyEntries),
            },
        };
    }

    private createDefaultDocumentDrafts(): CandidateDocumentView[] {
        const options = this.documentUploadOptions ?? [
            { type: 'i9', label: 'I-9' },
            { type: 'w4', label: 'W-4' },
            { type: 'everify', label: 'E-Verify' },
            { type: 'direct_deposit', label: 'Direct Deposit Form' },
            { type: 'workers_comp', label: 'Workers Comp' },
            { type: 'exemption', label: 'Exemption' },
            { type: 'liability', label: 'Liability Insurance' },
            { type: 'other', label: 'Other HR Document' },
        ];

        return options.map((item) => ({
            type: item.type,
            label: item.label,
            files: [],
            existingDocuments: [],
        }));
    }

    private applyExistingDocuments(documentDrafts: CandidateDocumentView[], documents: CandidateSearchDocument[]): CandidateDocumentView[] {
        const nextDrafts: CandidateDocumentView[] = documentDrafts.map((item) => ({
            ...item,
            files: [...item.files],
            existingDocuments: [] as CandidateSearchDocument[],
        }));

        for (const document of documents) {
            const target = nextDrafts.find((item) => item.type === document.type) ?? nextDrafts.find((item) => item.type === 'other');
            if (!target) {
                continue;
            }

            target.existingDocuments = [...target.existingDocuments, document];
        }

        return nextDrafts;
    }

    private mergeUploadedDocuments(documentDrafts: CandidateDocumentView[], uploadedDocuments: CandidateSearchDocument[]): CandidateDocumentView[] {
        if (uploadedDocuments.length === 0) {
            return documentDrafts;
        }

        const nextDrafts: CandidateDocumentView[] = documentDrafts.map((item) => ({
            ...item,
            files: [],
            existingDocuments: [...item.existingDocuments],
        }));

        for (const document of uploadedDocuments) {
            const target = nextDrafts.find((item) => item.type === document.type) ?? nextDrafts.find((item) => item.type === 'other');
            if (!target) {
                continue;
            }

            target.existingDocuments = [...target.existingDocuments, document];
        }

        return nextDrafts.map((item) => ({
            ...item,
            files: [],
        }));
    }

    private async ensureCandidatesCollectionReady(candidatePayload: Record<string, unknown>) {
        const candidatesCollection = collection(this.firestore, 'candidates');
        const snapshot = await getDocs(query(candidatesCollection, limit(1)));

        if (!snapshot.empty) {
            return { candidatesCollection, payload: candidatePayload };
        }

        const templateSourceCollection = collection(this.firestore, 'workers');
        const templateSourceSnapshot = await getDocs(query(templateSourceCollection, limit(1)));

        if (templateSourceSnapshot.empty) {
            throw new Error('Could not initialize the candidates collection. The workers collection has no template document to clone from.');
        }

        const templateDocument = templateSourceSnapshot.docs[0].data() as Record<string, unknown>;
        return {
            candidatesCollection,
            payload: this.cloneCandidatePayloadFromWorkerTemplate(templateDocument, candidatePayload),
        };
    }

    private cloneCandidatePayloadFromWorkerTemplate(
        templateDocument: Record<string, unknown>,
        candidatePayload: Record<string, unknown>,
    ): Record<string, unknown> {
        const templateAddress = this.asRecord(templateDocument['address']);
        const templateWorkAuthorization = this.asRecord(templateDocument['workAuthorization']);
        const templatePay = this.asRecord(templateDocument['pay']);
        const templateEmployment = this.asRecord(templateDocument['employment']);
        const templateVacation = this.asRecord(templateDocument['vacation']);
        const templateEmergencyContact = this.asRecord(templateDocument['emergencyContact']);

        const payloadAddress = this.asRecord(candidatePayload['address']);
        const payloadWorkAuthorization = this.asRecord(candidatePayload['workAuthorization']);
        const payloadPay = this.asRecord(candidatePayload['pay']);
        const payloadEmployment = this.asRecord(candidatePayload['employment']);
        const payloadVacation = this.asRecord(candidatePayload['vacation']);
        const payloadEmergencyContact = this.asRecord(candidatePayload['emergencyContact']);

        return {
            ...candidatePayload,
            address: this.mergeTemplateStructure(templateAddress, payloadAddress),
            workAuthorization: this.mergeTemplateStructure(templateWorkAuthorization, payloadWorkAuthorization),
            pay: this.mergeTemplateStructure(templatePay, payloadPay),
            employment: this.mergeTemplateStructure(templateEmployment, payloadEmployment),
            vacation: this.mergeTemplateStructure(templateVacation, payloadVacation),
            emergencyContact: this.mergeTemplateStructure(templateEmergencyContact, payloadEmergencyContact),
        };
    }

    private mergeTemplateStructure(template: Record<string, unknown>, payload: Record<string, unknown>): Record<string, unknown> {
        const merged: Record<string, unknown> = { ...template, ...payload };
        const keys = new Set([...Object.keys(template), ...Object.keys(payload)]);

        for (const key of keys) {
            const templateValue = template[key];
            const payloadValue = payload[key];

            if (this.isPlainRecord(templateValue) || this.isPlainRecord(payloadValue)) {
                merged[key] = this.mergeTemplateStructure(this.asRecord(templateValue), this.asRecord(payloadValue));
                continue;
            }

            if (payloadValue !== undefined) {
                merged[key] = payloadValue;
                continue;
            }

            merged[key] = templateValue ?? null;
        }

        return merged;
    }


    private asRecord(value: unknown): Record<string, unknown> {
        return this.isPlainRecord(value) ? value : {};
    }

    private isPlainRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    private toNumberOrNull(value: unknown): number | null {
        const normalized = value === '' || value === undefined || value === null ? NaN : Number(value);
        return Number.isFinite(normalized) ? normalized : null;
    }
}
