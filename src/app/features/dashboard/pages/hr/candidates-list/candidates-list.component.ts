
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {collection, deleteDoc, doc, Firestore, getDocs} from '@angular/fire/firestore';
import {deleteObject, ref, Storage} from '@angular/fire/storage';
import {CandidateSearchService} from 'src/app/services/candidate-search.service';
import {CandidateService} from 'src/app/services/candidate.service';
import {
    CreateCandidateComponent
} from 'src/app/features/dashboard/pages/hr/create-candidate/create-candidate.component';
import type {DocumentData, QueryDocumentSnapshot} from 'firebase/firestore';

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

interface EmergencyContactView {
    name: string;
    relationship: string;
    phone: string;
}

interface CandidateListItem {
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
    candidateStatus?: string;
    stage?: string;
    source?: string;
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
    screenAccess: {
        overview: boolean;
        construction: boolean;
        workers: boolean;
        humanResources: boolean;
        companies: boolean;
        settings: boolean;
    };
    w2Compliance: W2ComplianceView;
    insuranceCompliance: InsuranceComplianceView;
    vacation: VacationView;
    emergencyContact: EmergencyContactView;
    notes: string;
    photoURL: string;
    photoStoragePath: string;
    convertedToWorkerId?: string | null;
}

type PaginationItem = number | 'ellipsis';

@Component({
    selector: 'app-candidates-list',
    imports: [FormsModule, CreateCandidateComponent],
    templateUrl: './candidates-list.component.html',
    styleUrl: './candidates-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CandidatesListComponent implements OnInit {
    private readonly firestore = inject(Firestore);
    private readonly storage = inject(Storage);
    private readonly changeDetectorRef = inject(ChangeDetectorRef);
    private readonly candidateSearchService = inject(CandidateSearchService);
    private readonly candidateService = inject(CandidateService);
    readonly pageSizeOptions = [10, 25, 50];
    private readonly pageStartCursors = new Map<number, QueryDocumentSnapshot<DocumentData> | null>([[1, null]]);
    private readonly pageCache = new Map<number, CandidateListItem[]>();
    private readonly searchPageStartCursors = new Map<number, QueryDocumentSnapshot<DocumentData> | null>([[1, null]]);
    private readonly searchPageCache = new Map<number, CandidateListItem[]>();
    private activeSearchTerm = '';

    candidates: CandidateListItem[] = [];
    filteredCandidates: CandidateListItem[] = [];
    selectedCandidate: CandidateListItem | null = null;
    searchTerm = '';
    pageSize = this.pageSizeOptions[0];
    currentPage = 1;
    totalCandidateCount = 0;
    totalSearchCount = 0;
    isLoadingCandidates = false;
    candidatesError = '';

    ngOnInit(): void {
        void this.loadCandidates(false);
    }

    async loadCandidates(forceRefresh = true): Promise<void> {
        if (this.hasSearchTerm()) {
            await this.filterCandidates(forceRefresh);
            return;
        }

        if (forceRefresh) {
            this.resetPagedCache();
        }

        this.isLoadingCandidates = true;
        this.candidatesError = '';
        this.changeDetectorRef.markForCheck();

        try {
            if (this.totalCandidateCount === 0 || forceRefresh) {
                this.totalCandidateCount = await this.candidateSearchService.countCandidates();
            }

            const targetPage = forceRefresh ? 1 : Math.min(this.currentPage, this.totalPages);
            await this.loadPage(targetPage);
        } catch (error: unknown) {
            this.candidatesError = error instanceof Error ? error.message : 'Could not load candidates.';
        } finally {
            this.isLoadingCandidates = false;
            this.changeDetectorRef.markForCheck();
        }
    }

    get paginatedCandidates(): CandidateListItem[] {
        if (!this.hasSearchTerm()) {
            return this.candidates;
        }

        return this.filteredCandidates;
    }

    get totalPages(): number {
        return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
    }

    get pageStart(): number {
        return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    }

    get pageEnd(): number {
        return Math.min(this.currentPage * this.pageSize, this.totalItems);
    }

    get totalVisibleCandidates(): number {
        return this.totalItems;
    }

    get paginationItems(): PaginationItem[] {
        if (this.totalPages <= 7) {
            return Array.from({ length: this.totalPages }, (_, index) => index + 1);
        }

        const items: PaginationItem[] = [1];
        const windowStart = Math.max(2, this.currentPage - 1);
        const windowEnd = Math.min(this.totalPages - 1, this.currentPage + 1);

        if (windowStart > 2) {
            items.push('ellipsis');
        }

        for (let page = windowStart; page <= windowEnd; page += 1) {
            items.push(page);
        }

        if (windowEnd < this.totalPages - 1) {
            items.push('ellipsis');
        }

        items.push(this.totalPages);
        return items;
    }

    async filterCandidates(resetPage = false): Promise<void> {
        const term = this.searchTerm.trim();
        if (!term) {
            this.totalSearchCount = 0;
            this.resetSearchCache();
            await this.loadCandidates(resetPage);
            return;
        }

        const isNewSearch = this.activeSearchTerm !== term;
        if (isNewSearch) {
            this.activeSearchTerm = term;
            this.resetSearchCache();
        }

        this.isLoadingCandidates = true;
        this.candidatesError = '';
        this.changeDetectorRef.markForCheck();

        try {
            if (isNewSearch || resetPage || this.totalSearchCount === 0) {
                this.totalSearchCount = await this.candidateService.countByTerm(term);
            }

            const targetPage = resetPage || isNewSearch ? 1 : Math.min(this.currentPage, this.totalPages);
            await this.loadSearchPage(term, targetPage);
        } catch (error: unknown) {
            this.candidatesError = error instanceof Error ? error.message : 'Could not load candidates.';
        } finally {
            this.isLoadingCandidates = false;
            this.changeDetectorRef.markForCheck();
        }
    }

    async updatePageSize(value: string): Promise<void> {
        const nextPageSize = Number(value);
        if (!this.pageSizeOptions.includes(nextPageSize) || nextPageSize === this.pageSize) {
            return;
        }

        this.pageSize = nextPageSize;
        this.currentPage = 1;
        this.resetPagedCache();
        this.resetSearchCache();

        if (this.hasSearchTerm()) {
            await this.filterCandidates(true);
            return;
        }

        await this.loadCandidates(false);
    }

    async goToPage(page: number): Promise<void> {
        const nextPage = Math.min(Math.max(page, 1), this.totalPages);
        if (nextPage === this.currentPage) {
            return;
        }

        if (this.hasSearchTerm()) {
            this.isLoadingCandidates = true;
            this.candidatesError = '';
            this.changeDetectorRef.markForCheck();

            try {
                await this.loadSearchPage(this.activeSearchTerm || this.searchTerm.trim(), nextPage);
            } catch (error: unknown) {
                this.candidatesError = error instanceof Error ? error.message : 'Could not load candidates.';
            } finally {
                this.isLoadingCandidates = false;
                this.changeDetectorRef.markForCheck();
            }
            return;
        }

        this.isLoadingCandidates = true;
        this.candidatesError = '';
        this.changeDetectorRef.markForCheck();

        try {
            await this.loadPage(nextPage);
        } catch (error: unknown) {
            this.candidatesError = error instanceof Error ? error.message : 'Could not load candidates.';
        } finally {
            this.isLoadingCandidates = false;
            this.changeDetectorRef.markForCheck();
        }
    }

    async goToPaginationItem(item: PaginationItem): Promise<void> {
        if (typeof item !== 'number') {
            return;
        }

        await this.goToPage(item);
    }

    editCandidate(candidate: CandidateListItem) {
        this.selectedCandidate = {
            ...candidate,
            screenAccess: { ...candidate.screenAccess },
            w2Compliance: { ...candidate.w2Compliance },
            insuranceCompliance: { ...candidate.insuranceCompliance },
            vacation: {
                policy: { ...candidate.vacation.policy },
                balance: { ...candidate.vacation.balance },
                tracking: { ...candidate.vacation.tracking },
            },
            bankInfo: { ...candidate.bankInfo },
            emergencyContact: { ...candidate.emergencyContact },
        };
        this.changeDetectorRef.markForCheck();
    }

    async deleteCandidate(candidate: CandidateListItem) {
        const candidateName = candidate.displayName || 'this candidate';
        const shouldDelete = window.confirm(`Delete ${candidateName}? This will remove the candidate record and uploaded files.`);

        if (!shouldDelete) {
            return;
        }

        this.isLoadingCandidates = true;
        this.candidatesError = '';
        this.changeDetectorRef.markForCheck();

        try {
            await this.deleteCandidateDocuments(candidate.id);
            await this.deleteStorageObject(candidate.photoStoragePath);
            await deleteDoc(doc(this.firestore, 'candidates', candidate.id));

            if (this.selectedCandidate?.id === candidate.id) {
                this.selectedCandidate = null;
            }

            this.removeCandidateFromCaches(candidate.id);
            this.totalCandidateCount = Math.max(0, this.totalCandidateCount - 1);
            await this.reloadVisibleCandidatesAfterMutation();
        } catch (error: unknown) {
            this.candidatesError = error instanceof Error ? error.message : 'Could not delete candidate.';
        } finally {
            this.isLoadingCandidates = false;
            this.changeDetectorRef.markForCheck();
        }
    }

    async handleCandidateSaved(updatedCandidate: CandidateListItem): Promise<void> {
        this.selectedCandidate = this.normalizeCandidate(updatedCandidate);

        this.resetPagedCache();
        this.resetSearchCache();
        this.totalCandidateCount = await this.candidateSearchService.countCandidates();
        await this.reloadVisibleCandidatesAfterMutation();
        this.changeDetectorRef.markForCheck();
    }

    clearSelection() {
        this.selectedCandidate = null;
    }

    getComplianceSummary(candidate: CandidateListItem): string {
        if (candidate.employmentType === '1099') {
            const parts: string[] = [];
            if (candidate.insuranceCompliance.hasWorkersComp) parts.push('Workers Comp');
            if (candidate.insuranceCompliance.exemptionProvided) parts.push('Exemption');
            if (candidate.insuranceCompliance.hasLiabilityInsurance) parts.push('Liability');
            return parts.length ? parts.join(' · ') : '1099 compliance missing';
        }

        const w2 = candidate.w2Compliance;
        const done = [w2.taxFormCompleted, w2.i9Completed, w2.eVerifyCompleted, w2.payrollSetup].filter(Boolean).length;
        return `W2 onboarding ${done}/4`;
    }

    private get totalItems(): number {
        return this.hasSearchTerm() ? this.totalSearchCount : this.totalCandidateCount;
    }

    private hasSearchTerm(): boolean {
        return this.searchTerm.trim().length > 0;
    }

    private resetPagedCache(): void {
        this.pageCache.clear();
        this.pageStartCursors.clear();
        this.pageStartCursors.set(1, null);
        this.candidates = [];
        this.filteredCandidates = [];
    }

    private resetSearchCache(): void {
        this.searchPageCache.clear();
        this.searchPageStartCursors.clear();
        this.searchPageStartCursors.set(1, null);
        this.filteredCandidates = [];
    }

    private async loadPage(page: number): Promise<void> {
        const cachedPage = this.pageCache.get(page);
        if (cachedPage) {
            this.currentPage = page;
            this.candidates = [...cachedPage];
            this.filteredCandidates = [...cachedPage];
            return;
        }

        const startCursor = await this.ensurePageCursor(page);
        const pageResult = await this.candidateSearchService.loadCandidatePage(this.pageSize, startCursor);
        const pageCandidates = pageResult.records.map((record) => this.mapCandidateDoc(record.id, record.data));
        this.pageCache.set(page, pageCandidates);
        this.pageStartCursors.set(page + 1, pageResult.lastVisible);
        this.currentPage = page;
        this.candidates = pageCandidates;
        this.filteredCandidates = [...pageCandidates];
    }

    private async loadSearchPage(term: string, page: number): Promise<void> {
        const cachedPage = this.searchPageCache.get(page);
        if (cachedPage) {
            this.currentPage = page;
            this.filteredCandidates = [...cachedPage];
            return;
        }

        const startCursor = await this.ensureSearchPageCursor(term, page);
        const pageResult = await this.candidateService.loadFilterPage(term, this.pageSize, startCursor);
        const pageCandidates = pageResult.records.map((record) => this.mapCandidateDoc(record.id, record.data));
        this.searchPageCache.set(page, pageCandidates);
        this.searchPageStartCursors.set(page + 1, pageResult.lastVisible);
        this.currentPage = page;
        this.filteredCandidates = pageCandidates;
    }

    private async ensurePageCursor(page: number): Promise<QueryDocumentSnapshot<DocumentData> | null> {
        if (page <= 1) {
            return null;
        }

        const existingCursor = this.pageStartCursors.get(page);
        if (existingCursor !== undefined) {
            return existingCursor;
        }

        let currentPage = 1;
        let currentCursor = this.pageStartCursors.get(1) ?? null;

        while (currentPage < page) {
            const cachedCursor = this.pageStartCursors.get(currentPage + 1);
            if (cachedCursor !== undefined) {
                currentCursor = cachedCursor;
                currentPage += 1;
                continue;
            }

            const pageResult = await this.candidateSearchService.loadCandidatePage(this.pageSize, currentCursor);
            const pageCandidates = pageResult.records.map((record) => this.mapCandidateDoc(record.id, record.data));
            this.pageCache.set(currentPage, pageCandidates);
            this.pageStartCursors.set(currentPage + 1, pageResult.lastVisible);
            currentCursor = pageResult.lastVisible;
            currentPage += 1;
        }

        return this.pageStartCursors.get(page) ?? null;
    }

    private async ensureSearchPageCursor(term: string, page: number): Promise<QueryDocumentSnapshot<DocumentData> | null> {
        if (page <= 1) {
            return null;
        }

        const existingCursor = this.searchPageStartCursors.get(page);
        if (existingCursor !== undefined) {
            return existingCursor;
        }

        let currentPage = 1;
        let currentCursor = this.searchPageStartCursors.get(1) ?? null;

        while (currentPage < page) {
            const cachedCursor = this.searchPageStartCursors.get(currentPage + 1);
            if (cachedCursor !== undefined) {
                currentCursor = cachedCursor;
                currentPage += 1;
                continue;
            }

            const pageResult = await this.candidateService.loadFilterPage(term, this.pageSize, currentCursor);
            const pageCandidates = pageResult.records.map((record) => this.mapCandidateDoc(record.id, record.data));
            this.searchPageCache.set(currentPage, pageCandidates);
            this.searchPageStartCursors.set(currentPage + 1, pageResult.lastVisible);
            currentCursor = pageResult.lastVisible;
            currentPage += 1;
        }

        return this.searchPageStartCursors.get(page) ?? null;
    }

    private removeCandidateFromCaches(candidateId: string): void {
        this.pageCache.forEach((pageCandidates, page) => {
            const nextPageCandidates = pageCandidates.filter((candidate) => candidate.id !== candidateId);
            this.pageCache.set(page, nextPageCandidates);
        });

        this.searchPageCache.forEach((pageCandidates, page) => {
            const nextPageCandidates = pageCandidates.filter((candidate) => candidate.id !== candidateId);
            this.searchPageCache.set(page, nextPageCandidates);
        });
    }

    private async reloadVisibleCandidatesAfterMutation(): Promise<void> {
        if (this.hasSearchTerm()) {
            await this.filterCandidates(false);
            return;
        }

        const nextPage = Math.min(this.currentPage, Math.max(1, Math.ceil(this.totalCandidateCount / this.pageSize)));
        this.resetPagedCache();
        await this.loadPage(nextPage);
    }

    private mapCandidateDoc(id: string, data: Record<string, unknown>): CandidateListItem {
        const firstName = String(data['firstName'] ?? '').trim();
        const middleName = String(data['middleName'] ?? '').trim();
        const lastName = String(data['lastName'] ?? '').trim();
        const email = String(data['email'] ?? '').trim().toLowerCase();
        const displayName = String(data['displayName'] ?? '').trim() || [firstName, middleName, lastName].filter(Boolean).join(' ') || email || id;
        const address = (data['address'] as Record<string, unknown> | undefined) ?? {};
        const workAuthorization = (data['workAuthorization'] as Record<string, unknown> | undefined) ?? {};
        const pay = (data['pay'] as Record<string, unknown> | undefined) ?? {};
        const bankInfo = (pay['bankInfo'] as Record<string, unknown> | undefined) ?? {};
        const employment = (data['employment'] as Record<string, unknown> | undefined) ?? {};
        const w2 = (employment['w2'] as Record<string, unknown> | undefined) ?? {};
        const contractor1099 = (employment['contractor1099'] as Record<string, unknown> | undefined) ?? {};
        const vacation = (data['vacation'] as Record<string, unknown> | undefined) ?? {};
        const vacationPolicy = (vacation['policy'] as Record<string, unknown> | undefined) ?? {};
        const vacationBalance = (vacation['balance'] as Record<string, unknown> | undefined) ?? {};
        const vacationTracking = (vacation['tracking'] as Record<string, unknown> | undefined) ?? {};
        const emergencyContact = (data['emergencyContact'] as Record<string, unknown> | undefined) ?? {};
        const employmentType = String(data['employmentType'] ?? employment['type'] ?? 'W2').trim().toUpperCase() === '1099' ? '1099' : 'W2';
        const candidateStatus = String(data['candidateStatus'] ?? data['stage'] ?? 'new').trim().toLowerCase() || 'new';

        const passportNumber = String(data['passportNumber'] ?? '').trim();
        const residenceNumber = String(data['residenceNumber'] ?? '').trim();
        const workPermitNumber = String(data['workPermitNumber'] ?? '').trim();

        return {
            id,
            candidateId: String(data['candidateId'] ?? id),
            workerId: String(data['convertedToWorkerId'] ?? ''),
            linkedAuthUid: null,
            canLogin: false,
            firstName,
            middleName,
            lastName,
            displayName,
            email,
            phone: String(data['phone'] ?? '').trim(),
            alternatePhone: String(data['alternatePhone'] ?? '').trim(),
            preferredLanguage: String(data['preferredLanguage'] ?? '').trim() || 'english',
            dateOfBirth: String(data['dateOfBirth'] ?? '').trim(),
            active: candidateStatus !== 'archived' && candidateStatus !== 'withdrawn',
            workerStatus: candidateStatus,
            candidateStatus,
            stage: String(data['stage'] ?? 'new').trim().toLowerCase() || 'new',
            source: String(data['source'] ?? 'manual').trim().toLowerCase() || 'manual',
            areaType: String(data['areaType'] ?? 'field').trim().toLowerCase() === 'office' ? 'office' : 'field',
            subRole: String(data['subRole'] ?? '').trim().toLowerCase() || 'helper',
            employmentType,
            addressLine1: String(address['line1'] ?? '').trim(),
            addressLine2: String(address['line2'] ?? '').trim(),
            city: String(address['city'] ?? '').trim(),
            state: String(address['state'] ?? '').trim().toUpperCase(),
            zip: String(address['zip'] ?? '').trim(),
            ssnFull: String(data['ssnFull'] ?? '').trim(),
            workAuthorizationStatus: String(workAuthorization['status'] ?? '').trim().toLowerCase() || 'citizen',
            workAuthorizationExpiration: String(workAuthorization['expirationDate'] ?? '').trim(),
            passportNumber,
            residenceNumber,
            workPermitNumber,   
            hireDate: String(data['hireDate'] ?? '').trim(),
            rehireDate: String(data['rehireDate'] ?? '').trim(),
            supervisor: String(data['supervisor'] ?? '').trim(),
            payType: String(pay['payType'] ?? 'hourly').trim() || 'hourly',
            hourlyRate: this.toNumberOrNull(pay['rate']),
            overtimeRate: this.toNumberOrNull(pay['overtimeRate']),
            paymentMethod: String(pay['paymentMethod'] ?? 'payroll').trim() || 'payroll',
            bankInfo: {
                bankName: String(bankInfo['bankName'] ?? '').trim(),
                accountType: String(bankInfo['accountType'] ?? 'checking').trim() || 'checking',
                routingNumber: String(bankInfo['routingNumber'] ?? '').trim(),
                accountNumber: String(bankInfo['accountNumber'] ?? '').trim(),
                accountHolderName: String(bankInfo['accountHolderName'] ?? '').trim(),
            },
            role: 'candidate',
            screenAccess: {
                overview: false,
                construction: false,
                workers: false,
                humanResources: false,
                companies: false,
                settings: false,
            },
            w2Compliance: {
                payrollSetup: w2['payrollSetup'] === true,
                taxFormCompleted: w2['taxFormCompleted'] === true,
                i9Completed: w2['i9Completed'] === true,
                eVerifyCompleted: w2['eVerifyCompleted'] === true,
                eVerifyCaseNumber: String(w2['eVerifyCaseNumber'] ?? '').trim(),
                eVerifyDate: String(w2['eVerifyDate'] ?? '').trim(),
            },
            insuranceCompliance: {
                hasWorkersComp: contractor1099['hasWorkersComp'] === true,
                workersCompPolicyNumber: String(contractor1099['workersCompPolicyNumber'] ?? '').trim(),
                workersCompExpiration: String(contractor1099['workersCompExpiration'] ?? '').trim(),
                exemptionProvided: contractor1099['exemptionProvided'] === true,
                exemptionType: String(contractor1099['exemptionType'] ?? '').trim(),
                exemptionExpiration: String(contractor1099['exemptionExpiration'] ?? '').trim(),
                hasLiabilityInsurance: contractor1099['hasLiabilityInsurance'] === true,
                liabilityPolicyNumber: String(contractor1099['liabilityPolicyNumber'] ?? '').trim(),
                liabilityExpiration: String(contractor1099['liabilityExpiration'] ?? '').trim(),
                companyName: String(contractor1099['companyName'] ?? '').trim(),
                ein: String(contractor1099['ein'] ?? '').trim(),
            },
            vacation: {
                policy: {
                    enabled: vacationPolicy['enabled'] === true,
                    ptoEligible: vacationPolicy['ptoEligible'] === true,
                    accrualMethod: String(vacationPolicy['accrualMethod'] ?? 'annual').trim() || 'annual',
                    annualDays: this.toNumberOrNull(vacationPolicy['annualDays']),
                    eligibilityMonths: this.toNumberOrNull(vacationPolicy['eligibilityMonths']),
                    allowCarryover: vacationPolicy['allowCarryover'] === true,
                    maxCarryoverDays: this.toNumberOrNull(vacationPolicy['maxCarryoverDays']),
                },
                balance: {
                    grantedDays: this.toNumberOrNull(vacationBalance['grantedDays']),
                    usedDays: this.toNumberOrNull(vacationBalance['usedDays']),
                    pendingDays: this.toNumberOrNull(vacationBalance['pendingDays']),
                    carryoverDays: this.toNumberOrNull(vacationBalance['carryoverDays']),
                    sickDays: this.toNumberOrNull(vacationBalance['sickDays']),
                    availableDays: this.toNumberOrNull(vacationBalance['availableDays']),
                },
                tracking: {
                    eligibleFrom: String(vacationTracking['eligibleFrom'] ?? '').trim(),
                    lastGrantedAt: String(vacationTracking['lastGrantedAt'] ?? '').trim(),
                    nextGrantAt: String(vacationTracking['nextGrantAt'] ?? '').trim(),
                    lastUsedAt: String(vacationTracking['lastUsedAt'] ?? '').trim(),
                    nextPlannedVacationDate: String(vacationTracking['nextPlannedVacationDate'] ?? '').trim(),
                    historyEntries: this.toNumberOrNull(vacationTracking['historyEntries']),
                },
            },
            emergencyContact: {
                name: String(emergencyContact['name'] ?? '').trim(),
                relationship: String(emergencyContact['relationship'] ?? '').trim(),
                phone: String(emergencyContact['phone'] ?? '').trim(),
            },
            notes: String(data['notes'] ?? '').trim(),
            photoURL: String(data['photoURL'] ?? '').trim(),
            photoStoragePath: String(data['photoStoragePath'] ?? '').trim(),
            convertedToWorkerId: String(data['convertedToWorkerId'] ?? '').trim() || null,
        };
    }

    private normalizeCandidate(candidate: CandidateListItem): CandidateListItem {
        const candidateStatus = String(candidate.candidateStatus ?? candidate.stage ?? 'new').trim().toLowerCase() || 'new';
        return {
            ...candidate,
            candidateId: String(candidate.candidateId ?? candidate.id),
            candidateStatus,
            stage: String(candidate.stage ?? candidateStatus).trim().toLowerCase() || candidateStatus,
            source: String(candidate.source ?? 'manual').trim().toLowerCase() || 'manual',
            convertedToWorkerId: candidate.convertedToWorkerId ?? null,
        };
    }

    private async deleteCandidateDocuments(candidateId: string): Promise<void> {
        const documentsCollection = collection(this.firestore, 'candidates', candidateId, 'documents');
        const documentsSnapshot = await getDocs(documentsCollection);

        await Promise.all(
            documentsSnapshot.docs.map(async (documentSnapshot) => {
                const data = documentSnapshot.data() as Record<string, unknown>;
                await this.deleteStorageObject(String(data['storagePath'] ?? '').trim());
                await deleteDoc(documentSnapshot.ref);
            })
        );
    }

    private async deleteStorageObject(storagePath: string): Promise<void> {
        if (!storagePath) {
            return;
        }

        try {
            await deleteObject(ref(this.storage, storagePath));
        } catch (error: unknown) {
            const code = typeof error === 'object' && error && 'code' in error ? String(error.code ?? '') : '';
            if (code !== 'storage/object-not-found') {
                throw error;
            }
        }
    }

    private toNumberOrNull(value: unknown): number | null {
        const normalized = value === '' || value === undefined || value === null ? NaN : Number(value);
        return Number.isFinite(normalized) ? normalized : null;
    }
}
