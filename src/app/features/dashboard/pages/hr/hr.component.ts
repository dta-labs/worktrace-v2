
import { AfterViewInit, Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Firestore, addDoc, collection, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query, serverTimestamp, startAfter, updateDoc } from '@angular/fire/firestore';
import { Storage, getDownloadURL, ref, uploadBytes } from '@angular/fire/storage';
import type { DocumentData, QueryConstraint, QueryDocumentSnapshot } from 'firebase/firestore';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { CandidateSearchDocument, CandidateSearchResult, CandidateSearchService } from '@app/services/candidate-search.service';
import { DriveFunctionsService } from '../../../../core/services/drive-functions.service';
import { DriveSettingsService } from '../../../../core/services/drive-settings.service';
import { UserAccessService, ScreenAccessMap } from '../../../../core/services/user-access.service';

import { CreateCandidateComponent } from './create-candidate/create-candidate.component';
import { CandidatesListComponent } from './candidates-list/candidates-list.component';

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

interface WorkerDocumentView {
  type: string;
  label: string;
  files: File[];
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

interface ManagedWorkerView {
  id: string;
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
}

type PaginationItem = number | 'ellipsis';

@Component({
  selector: 'app-hr-page',
  imports: [FormsModule, CreateCandidateComponent, CandidatesListComponent],
  templateUrl: './hr.component.html',
  styleUrl: './hr.component.scss'
})
export class HrPageComponent implements OnInit, AfterViewInit {
  private readonly firestore = inject(Firestore);
  private readonly candidateSearchService = inject(CandidateSearchService);
  private readonly driveFns = inject(DriveFunctionsService);
  private readonly driveSettings = inject(DriveSettingsService);
  private readonly storage = inject(Storage);
  readonly pageSizeOptions = [10, 25, 50];
  private readonly pageStartCursors = new Map<number, QueryDocumentSnapshot<DocumentData> | null>([[1, null]]);
  private readonly pageCache = new Map<number, ManagedWorkerView[]>();
  private readonly searchPageStartCursors = new Map<number, QueryDocumentSnapshot<DocumentData> | null>([[1, null]]);
  private readonly searchPageCache = new Map<number, ManagedWorkerView[]>();
  private readonly searchBatchSize = 50;
  private activeSearchTerm = '';

  activeTab: 'worker-records' | 'user-access' | 'overview' | 'reports' | 'candidate-records' = 'candidate-records';
  workerRecordsView: 'create' | 'manage' = 'create';
  candidateRecordsView: 'create' | 'manage' = 'create';
  activeSection: 'identity' | 'employment' | 'compensation' | 'documents' | 'notes' = 'identity';
  @ViewChild('createWorkerScroll') createWorkerScroll?: ElementRef<HTMLElement>;
  @ViewChildren('draftDocumentInput') draftDocumentInputs?: QueryList<ElementRef<HTMLInputElement>>;
  isSaving = false;
  createMessage = '';
  createError = '';

  workers: ManagedWorkerView[] = [];
  filteredWorkers: ManagedWorkerView[] = [];
  searchTerm = '';
  pageSize = this.pageSizeOptions[0];
  currentPage = 1;
  totalWorkerCount = 0;
  totalSearchCount = 0;
  candidateSearchTerm = '';
  candidateSearchResults: CandidateSearchResult[] = [];
  selectedCandidateOption: CandidateSearchResult | null = null;
  selectedCandidateDocuments: CandidateSearchDocument[] = [];
  isSearchingCandidates = false;
  isCandidateSearchOpen = false;
  isLoadingSelectedCandidateDocuments = false;
  candidateSearchError = '';
  isLoadingWorkers = false;
  workersError = '';
  selectedWorker: ManagedWorkerView | null = null;
  saveWorkerMessage = '';
  saveWorkerError = '';
  isUpdatingWorker = false;
  private candidateSearchRequestId = 0;
  private candidateSelectionRequestId = 0;

  draftWorker = this.createEmptyDraft();
  draftDocuments = this.createDefaultDocumentDrafts();
  selectedWorkerDocuments = this.createDefaultDocumentDrafts();
  draftPhoto = this.createEmptyPhotoDraft();
  selectedWorkerPhoto = this.createEmptyPhotoDraft();

  readonly screenOptions = [
    { key: 'overview', label: 'Overview', hint: 'Dashboard and general summary' },
    { key: 'construction', label: 'Construction Department', hint: 'Bids and projects module' },
    { key: 'workers', label: 'Workers', hint: 'Field and office worker records' },
    { key: 'humanResources', label: 'Human Resources', hint: 'User creation and HR area' },
    { key: 'companies', label: 'Companies', hint: 'Company directory and setup' },
    { key: 'shop', label: 'Shop', hint: 'Shop' },
    { key: 'settings', label: 'Settings', hint: 'System configuration and integrations' },
  ] as const;

  readonly employmentOptions = ['W2', '1099'] as const;
  readonly areaOptions = ['field', 'office'] as const;
  readonly roleOptions = ['worker', 'foreman', 'estimator', 'office', 'admin'] as const;
  readonly authorizationOptions = ['citizen', 'resident', 'work_permit', 'other'] as const;
  readonly workerStatusOptions = ['active', 'inactive', 'on_leave', 'terminated'] as const;
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

  constructor(public userAccess: UserAccessService) { }

  ngOnInit(): void {
    void this.loadWorkers(false);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.refreshActiveSection();
      this.syncDraftDocumentInputs();
    }, 0);
  }

  setTab(tab: 'worker-records' | 'user-access' | 'overview' | 'reports' | 'candidate-records') {
    this.activeTab = tab;
    if (tab === 'candidate-records') {
      this.candidateRecordsView = 'create';
    }
    if (tab === 'worker-records' && this.workerRecordsView === 'create') {
      setTimeout(() => this.refreshActiveSection(), 0);
    }
  }

  setWorkerRecordsView(view: 'create' | 'manage') {
    this.workerRecordsView = view;
    if (view === 'create') {
      setTimeout(() => this.refreshActiveSection(), 0);
    }
  }

  setCandidateRecordsView(view: 'create' | 'manage') {
    this.candidateRecordsView = view;
    if (view === 'create') {
      setTimeout(() => this.refreshActiveSection(), 0);
    }
  }

  scrollToSection(section: 'identity' | 'employment' | 'compensation' | 'documents' | 'notes') {
    this.activeSection = section;
    const el = document.getElementById(`hr-section-${section}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onCreateWorkerScroll(event: Event) {
    const container = event.target as HTMLElement | null;
    this.refreshActiveSection(container ?? undefined);
  }

  private refreshActiveSection(containerEl?: HTMLElement) {
    const container = containerEl ?? this.createWorkerScroll?.nativeElement;
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

  private syncPagination(resetPage: boolean): void {
    if (resetPage) {
      this.currentPage = 1;
      return;
    }

    this.currentPage = Math.min(this.currentPage, this.totalPages);
  }

  private get totalItems(): number {
    return this.hasSearchTerm() ? this.totalSearchCount : this.totalWorkerCount;
  }

  async loadWorkers(forceRefresh = true): Promise<void> {
    if (this.hasSearchTerm()) {
      await this.filterWorkers(forceRefresh);
      return;
    }

    if (forceRefresh) {
      this.resetPagedCache();
    }

    this.isLoadingWorkers = true;
    this.workersError = '';

    try {
      if (this.totalWorkerCount === 0 || forceRefresh) {
        this.totalWorkerCount = await this.countWorkers();
      }

      const targetPage = forceRefresh ? 1 : Math.min(this.currentPage, this.totalPages);
      await this.loadPage(targetPage);
    } catch (error: unknown) {
      this.workersError = error instanceof Error ? error.message : 'Could not load workers.';
    } finally {
      this.isLoadingWorkers = false;
    }
  }

  get paginatedWorkers(): ManagedWorkerView[] {
    if (!this.hasSearchTerm()) {
      return this.workers;
    }

    return this.filteredWorkers;
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

  get totalVisibleWorkers(): number {
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

  async filterWorkers(resetPage = false): Promise<void> {
    const term = this.searchTerm.trim();
    if (!term) {
      this.totalSearchCount = 0;
      this.resetSearchCache();
      await this.loadWorkers(resetPage);
      return;
    }

    const isNewSearch = this.activeSearchTerm !== term;
    if (isNewSearch) {
      this.activeSearchTerm = term;
      this.resetSearchCache();
    }

    this.isLoadingWorkers = true;
    this.workersError = '';

    try {
      if (isNewSearch || resetPage || this.totalSearchCount === 0) {
        this.totalSearchCount = await this.countWorkersByTerm(term);
      }

      const targetPage = resetPage || isNewSearch ? 1 : Math.min(this.currentPage, this.totalPages);
      await this.loadSearchPage(term, targetPage);
    } catch (error: unknown) {
      this.workersError = error instanceof Error ? error.message : 'Could not load workers.';
    } finally {
      this.isLoadingWorkers = false;
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
      await this.filterWorkers(true);
      return;
    }

    await this.loadWorkers(false);
  }

  async goToPage(page: number): Promise<void> {
    const nextPage = Math.min(Math.max(page, 1), this.totalPages);
    if (nextPage === this.currentPage) {
      return;
    }

    this.isLoadingWorkers = true;
    this.workersError = '';

    try {
      if (this.hasSearchTerm()) {
        await this.loadSearchPage(this.activeSearchTerm || this.searchTerm.trim(), nextPage);
      } else {
        await this.loadPage(nextPage);
      }
    } catch (error: unknown) {
      this.workersError = error instanceof Error ? error.message : 'Could not load workers.';
    } finally {
      this.isLoadingWorkers = false;
    }
  }

  async goToPaginationItem(item: PaginationItem): Promise<void> {
    if (typeof item !== 'number') {
      return;
    }

    await this.goToPage(item);
  }

  getSubRoleOptions(area: 'field' | 'office'): readonly string[] {
    return area === 'office' ? this.officeSubRoleOptions : this.fieldSubRoleOptions;
  }

  onDraftAreaChange() {
    const options = this.getSubRoleOptions(this.draftWorker.areaType);
    if (!options.includes(this.draftWorker.subRole as any)) {
      this.draftWorker.subRole = options[0] ?? '';
    }
  }

  onSelectedAreaChange() {
    if (!this.selectedWorker) return;
    const options = this.getSubRoleOptions(this.selectedWorker.areaType);
    if (!options.includes(this.selectedWorker.subRole as any)) {
      this.selectedWorker.subRole = options[0] ?? '';
    }
  }

  onDraftEmploymentTypeChange() {
    if (this.draftWorker.employmentType === '1099') {
      this.draftWorker.payType = 'hourly';
      this.draftWorker.overtimeRate = '';
      this.draftWorker.w2Compliance = this.createDefaultW2Compliance();
      if (this.draftWorker.paymentMethod === 'payroll') this.draftWorker.paymentMethod = '1099_invoice';
    } else {
      this.updateDraftOvertimeRate();
    }
  }

  onSelectedEmploymentTypeChange() {
    if (!this.selectedWorker) return;
    if (this.selectedWorker.employmentType === '1099') {
      this.selectedWorker.payType = 'hourly';
      this.selectedWorker.overtimeRate = null;
      this.selectedWorker.w2Compliance = this.createDefaultW2Compliance();
      if (this.selectedWorker.paymentMethod === 'payroll') this.selectedWorker.paymentMethod = '1099_invoice';
    } else {
      this.updateSelectedOvertimeRate();
    }
  }

  updateDraftOvertimeRate() {
    const base = this.toNumberOrNull(this.draftWorker.hourlyRate);
    this.draftWorker.overtimeRate = this.draftWorker.employmentType === 'W2' && base !== null ? Number((base * 1.5).toFixed(2)) : '';
  }

  updateSelectedOvertimeRate() {
    if (!this.selectedWorker) return;
    const base = this.toNumberOrNull(this.selectedWorker.hourlyRate);
    this.selectedWorker.overtimeRate = this.selectedWorker.employmentType === 'W2' && base !== null ? Number((base * 1.5).toFixed(2)) : null;
  }

  onDraftPaymentMethodChange() {
    if (this.draftWorker.paymentMethod !== 'direct_deposit') {
      this.draftWorker.bankInfo = this.createDefaultBankInfo();
    }
  }

  onSelectedPaymentMethodChange() {
    if (!this.selectedWorker) return;
    if (this.selectedWorker.paymentMethod !== 'direct_deposit') {
      this.selectedWorker.bankInfo = this.createDefaultBankInfo();
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
    const target = this.selectedWorkerDocuments.find((item) => item.type === docType);
    if (target) target.files = files;
  }

  onDraftPhotoSelected(event: Event) {
    this.applyPhotoSelection(event, this.draftPhoto, this.draftWorker);
  }

  onSelectedWorkerPhotoSelected(event: Event) {
    this.applyPhotoSelection(event, this.selectedWorkerPhoto, this.selectedWorker);
  }

  clearDraftPhoto() {
    this.clearPhotoDraft(this.draftPhoto, this.draftWorker);
  }

  clearSelectedWorkerPhoto() {
    this.clearPhotoDraft(this.selectedWorkerPhoto, this.selectedWorker);
  }

  getPhotoPreview(photoUrl: string | null | undefined, photoDraft?: PassportPhotoDraft | null): string {
    return photoDraft?.previewUrl || String(photoUrl ?? '').trim() || '';
  }

  getWorkerInitials(firstName?: string | null, lastName?: string | null): string {
    const first = String(firstName ?? '').trim();
    const last = String(lastName ?? '').trim();
    return `${first.charAt(0)}${last.charAt(0)}`.trim().toUpperCase() || 'WT';
  }

  private applyPhotoSelection(event: Event, target: PassportPhotoDraft, workerRef?: { photoURL?: string; photoStoragePath?: string } | null) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.createError = 'Worker photo must be an image file.';
      if (input) input.value = '';
      return;
    }

    const maxBytes = 4 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.createError = 'Worker photo must be 4 MB or smaller.';
      if (input) input.value = '';
      return;
    }

    target.file = file;
    target.previewUrl = URL.createObjectURL(file);
    target.storagePath = '';
    if (workerRef) {
      workerRef.photoURL = '';
      workerRef.photoStoragePath = '';
    }
    if (input) input.value = '';
  }

  private clearPhotoDraft(target: PassportPhotoDraft, workerRef?: { photoURL?: string; photoStoragePath?: string } | null) {
    if (target.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(target.previewUrl);
    }
    target.file = null;
    target.previewUrl = '';
    target.storagePath = '';
    if (workerRef) {
      workerRef.photoURL = '';
      workerRef.photoStoragePath = '';
    }
  }

  isDraftW2(): boolean {
    return String(this.draftWorker.employmentType ?? 'W2').trim().toUpperCase() === 'W2';
  }

  isDraft1099(): boolean {
    return String(this.draftWorker.employmentType ?? 'W2').trim().toUpperCase() === '1099';
  }

  isDraftDirectDeposit(): boolean {
    return String(this.draftWorker.paymentMethod ?? '').trim().toLowerCase() === 'direct_deposit';
  }

  private getDocumentDraftFiles(documentDrafts: WorkerDocumentView[], type: string): File[] {
    return documentDrafts.find((item) => item.type === type)?.files ?? [];
  }

  private hasDocumentDraftFiles(documentDrafts: WorkerDocumentView[], type: string): boolean {
    return this.getDocumentDraftFiles(documentDrafts, type).length > 0;
  }

  private validateRequiredCreateFields(worker: ManagedWorkerView | any, documentDrafts: WorkerDocumentView[]) {
    const employmentType = String(worker?.employmentType ?? 'W2').trim().toUpperCase();
    const payType = String(worker?.payType ?? '').trim().toLowerCase();
    const paymentMethod = String(worker?.paymentMethod ?? '').trim().toLowerCase();

    const missing: string[] = [];

    const requireText = (value: any, label: string) => {
      if (!String(value ?? '').trim()) missing.push(label);
    };

    const requireNumber = (value: any, label: string) => {
      if (this.toNumberOrNull(value) === null) missing.push(label);
    };

    const requireTrue = (value: any, label: string) => {
      if (value !== true) missing.push(label);
    };

    const requireDoc = (type: string, label: string) => {
      if (!this.hasDocumentDraftFiles(documentDrafts, type)) missing.push(label);
    };

    requireText(worker?.firstName, 'First name');
    requireText(worker?.lastName, 'Last name');
    requireText(worker?.employmentType, 'Employment type');
    requireText(worker?.payType, 'Pay type');

    if (['hourly', 'salary', 'day_rate'].includes(payType)) {
      requireNumber(worker?.hourlyRate, payType === 'salary' ? 'Salary / regular rate' : 'Regular rate');
    }

    if (paymentMethod === 'direct_deposit') {
      requireText(worker?.bankInfo?.bankName, 'Bank name');
      requireText(worker?.bankInfo?.accountHolderName, 'Account holder name');
      requireText(worker?.bankInfo?.routingNumber, 'Routing number');
      requireText(worker?.bankInfo?.accountNumber, 'Account number');
      requireDoc('direct_deposit', 'Direct Deposit Form document');
    }

    if (employmentType === 'W2') {
      requireTrue(worker?.w2Compliance?.payrollSetup, 'Payroll setup');
      requireTrue(worker?.w2Compliance?.taxFormCompleted, 'W-4 / tax form completed');
      requireTrue(worker?.w2Compliance?.i9Completed, 'I-9 completed');
      requireTrue(worker?.w2Compliance?.eVerifyCompleted, 'E-Verify completed');
      requireText(worker?.w2Compliance?.eVerifyCaseNumber, 'E-Verify case number');
      requireText(worker?.w2Compliance?.eVerifyDate, 'E-Verify date');
      requireDoc('i9', 'I-9 document');
      requireDoc('w4', 'W-4 document');
      requireDoc('everify', 'E-Verify document');
    }

    if (employmentType === '1099') {
      requireText(worker?.insuranceCompliance?.companyName, '1099 company name');
      requireText(worker?.insuranceCompliance?.ein, 'EIN');

      const hasWorkersComp = worker?.insuranceCompliance?.hasWorkersComp === true;
      const hasExemption = worker?.insuranceCompliance?.exemptionProvided === true;

      if (!hasWorkersComp && !hasExemption) {
        missing.push('Workers Comp on file or Exemption provided');
      }

      if (hasWorkersComp) {
        requireText(worker?.insuranceCompliance?.workersCompPolicyNumber, 'Workers Comp policy #');
        requireText(worker?.insuranceCompliance?.workersCompExpiration, 'Workers Comp expiration');
        requireDoc('workers_comp', 'Workers Comp document');
      }

      if (hasExemption) {
        requireText(worker?.insuranceCompliance?.exemptionType, 'Exemption type');
        requireText(worker?.insuranceCompliance?.exemptionExpiration, 'Exemption expiration');
        requireDoc('exemption', 'Exemption document');
      }

      if (worker?.insuranceCompliance?.hasLiabilityInsurance === true) {
        requireText(worker?.insuranceCompliance?.liabilityPolicyNumber, 'Liability policy #');
        requireText(worker?.insuranceCompliance?.liabilityExpiration, 'Liability expiration');
        requireDoc('liability', 'Liability Insurance document');
      }
    }

    if (missing.length) {
      throw new Error(`Please complete the required Create Worker fields: ${missing.join(', ')}.`);
    }
  }


  editWorker(worker: ManagedWorkerView) {
    this.saveWorkerMessage = '';
    this.saveWorkerError = '';
    this.selectedWorker = {
      ...worker,
      screenAccess: { ...worker.screenAccess },
      w2Compliance: { ...worker.w2Compliance },
      insuranceCompliance: { ...worker.insuranceCompliance },
      vacation: this.cloneVacation(worker.vacation, worker.hireDate),
      bankInfo: this.cloneBankInfo(worker.bankInfo),
    };
    this.selectedWorkerDocuments = this.createDefaultDocumentDrafts();
    this.selectedWorkerPhoto = {
      file: null,
      previewUrl: worker.photoURL || '',
      storagePath: worker.photoStoragePath || '',
    };
  }

  closeEditor() {
    this.selectedWorker = null;
    this.selectedWorkerDocuments = this.createDefaultDocumentDrafts();
    this.selectedWorkerPhoto = this.createEmptyPhotoDraft();
    this.saveWorkerError = '';
  }

  toggleDraftScreen(key: keyof ScreenAccessMap) {
    this.draftWorker.screenAccess[key] = !this.draftWorker.screenAccess[key];
  }

  toggleSelectedScreen(key: keyof ScreenAccessMap) {
    if (!this.selectedWorker) return;
    this.selectedWorker.screenAccess[key] = !this.selectedWorker.screenAccess[key];
  }

  refreshDraftVacation() {
    this.draftWorker.vacation = this.cloneVacation(this.draftWorker.vacation, this.draftWorker.hireDate);
  }

  refreshSelectedVacation() {
    if (!this.selectedWorker) return;
    this.selectedWorker.vacation = this.cloneVacation(this.selectedWorker.vacation, this.selectedWorker.hireDate);
  }

  onCandidateSearchInput() {
    this.selectedCandidateOption = null;
    this.candidateSearchError = '';
    this.isCandidateSearchOpen = true;
    void this.searchCandidateOptions();
  }

  onCandidateSearchFocus() {
    if (!this.candidateSearchTerm.trim()) {
      return;
    }

    this.isCandidateSearchOpen = true;
    void this.searchCandidateOptions();
  }

  async selectCandidateOption(candidate: CandidateSearchResult) {
    this.createError = '';
    this.candidateSearchError = '';
    const requestId = ++this.candidateSelectionRequestId;

    this.selectedCandidateOption = candidate;
    this.selectedCandidateDocuments = [];
    this.candidateSearchTerm = candidate.displayName;
    this.candidateSearchResults = [];
    this.isCandidateSearchOpen = false;
    this.isLoadingSelectedCandidateDocuments = true;

    try {
      const candidateSnapshot = await getDoc(doc(this.firestore, 'candidates', candidate.id));

      if (!candidateSnapshot.exists()) {
        throw new Error('The selected candidate record no longer exists.');
      }

      if (requestId !== this.candidateSelectionRequestId) {
        return;
      }

      this.applyCandidateToDraft(candidate, candidateSnapshot.data() as Record<string, unknown>);

      void this.hydrateSelectedCandidateDocuments(candidate, requestId);
    } catch (error: unknown) {
      if (requestId === this.candidateSelectionRequestId) {
        this.candidateSearchError = error instanceof Error ? error.message : 'Could not load the selected candidate.';
        this.isLoadingSelectedCandidateDocuments = false;
      }
    } finally {
      if (requestId !== this.candidateSelectionRequestId) {
        return;
      }

      if (!this.isLoadingSelectedCandidateDocuments) {
        return;
      }
    }
  }

  clearCandidateSelection() {
    this.candidateSelectionRequestId++;
    this.selectedCandidateOption = null;
    this.selectedCandidateDocuments = [];
    this.candidateSearchTerm = '';
    this.candidateSearchResults = [];
    this.candidateSearchError = '';
    this.isCandidateSearchOpen = false;
    this.isLoadingSelectedCandidateDocuments = false;
  }

  showEmptyCandidateSearchState(): boolean {
    return this.isCandidateSearchOpen && !this.isSearchingCandidates && !this.candidateSearchError && !!this.candidateSearchTerm.trim() && this.candidateSearchResults.length === 0;
  }

  async createWorker() {
    if (this.isSaving) return;

    this.createMessage = '';
    this.createError = '';

    try {
      this.validateWorkerCompliance(this.draftWorker);
      this.validateRequiredCreateFields(this.draftWorker, this.draftDocuments);

      const firstName = String(this.draftWorker.firstName ?? '').trim();
      const middleName = String(this.draftWorker.middleName ?? '').trim();
      const lastName = String(this.draftWorker.lastName ?? '').trim();
      const email = String(this.draftWorker.email ?? '').trim().toLowerCase();

      if (!firstName || !lastName) {
        throw new Error('First name and last name are required.');
      }

      const displayName = [firstName, middleName, lastName].filter(Boolean).join(' ') || email || 'Worker';
      const isActive = this.draftWorker.workerStatus === 'active';
      const workerPayload = {
        workerId: '',
        firstName,
        middleName,
        lastName,
        displayName,
        email,
        phone: String(this.draftWorker.phone ?? '').trim(),
        alternatePhone: String(this.draftWorker.alternatePhone ?? '').trim(),
        preferredLanguage: String(this.draftWorker.preferredLanguage ?? '').trim() || 'english',
        dateOfBirth: String(this.draftWorker.dateOfBirth ?? '').trim() || null,
        workerStatus: String(this.draftWorker.workerStatus ?? '').trim() || (isActive ? 'active' : 'inactive'),
        areaType: this.draftWorker.areaType === 'office' ? 'office' : 'field',
        subRole: String(this.draftWorker.subRole ?? '').trim().toLowerCase() || 'helper',
        employmentType: this.draftWorker.employmentType === '1099' ? '1099' : 'W2',
        active: isActive,
        address: {
          line1: String(this.draftWorker.addressLine1 ?? '').trim(),
          line2: String(this.draftWorker.addressLine2 ?? '').trim(),
          city: String(this.draftWorker.city ?? '').trim(),
          state: String(this.draftWorker.state ?? '').trim().toUpperCase(),
          zip: String(this.draftWorker.zip ?? '').trim(),
        },
        ssnFull: String(this.draftWorker.ssnFull ?? '').trim(),
        workAuthorization: {
          status: String(this.draftWorker.workAuthorizationStatus ?? '').trim().toLowerCase() || 'citizen',
          expirationDate:
            String(this.draftWorker.workAuthorizationStatus ?? '').trim().toLowerCase() === 'citizen'
              ? null
              : (String(this.draftWorker.workAuthorizationExpiration ?? '').trim() || null),
        },
        pay: {
          payType: String(this.draftWorker.payType ?? 'hourly').trim() || 'hourly',
          rate: this.toNumberOrNull(this.draftWorker.hourlyRate),
          overtimeRate: this.toNumberOrNull(this.draftWorker.overtimeRate),
          paymentMethod: String(this.draftWorker.paymentMethod ?? '').trim() || 'payroll',
          bankInfo: this.cloneBankInfo(this.draftWorker.bankInfo),
        },
        employment: {
          type: this.draftWorker.employmentType === '1099' ? '1099' : 'W2',
          w2: this.cloneW2Compliance(this.draftWorker.w2Compliance),
          contractor1099: this.cloneInsuranceCompliance(this.draftWorker.insuranceCompliance),
        },
        vacation: this.cloneVacation(this.draftWorker.vacation, this.draftWorker.hireDate),
        emergencyContact: this.cloneEmergencyContact(this.draftWorker.emergencyContact),
        notes: String(this.draftWorker.notes ?? '').trim(),
        hireDate: String(this.draftWorker.hireDate ?? '').trim() || null,
        rehireDate: String(this.draftWorker.rehireDate ?? '').trim() || null,
        supervisor: String(this.draftWorker.supervisor ?? '').trim(),
        passportNumber: String(this.draftWorker.passportNumber ?? '').trim(),
        residenceNumber: String(this.draftWorker.residenceNumber ?? '').trim(),
        workPermitNumber: String(this.draftWorker.workPermitNumber ?? '').trim(),
        linkedAuthUid: null,
        canLogin: false,
        accessRole: 'worker',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      this.isSaving = true;
      const workerRef = await addDoc(collection(this.firestore, 'workers'), workerPayload);
      await updateDoc(doc(this.firestore, 'workers', workerRef.id), { workerId: workerRef.id });

      const driveStatusMessage = await this.ensureWorkerDriveFolder(workerRef.id, firstName, lastName);

      const photoPatch = await this.uploadWorkerPassportPhoto(workerRef.id, firstName, lastName, this.draftPhoto);
      if (photoPatch) {
        await updateDoc(doc(this.firestore, 'workers', workerRef.id), photoPatch);
      }

      // await this.uploadWorkerDocuments(workerRef.id, firstName, lastName, this.draftDocuments);

      this.createMessage = driveStatusMessage ? `Worker created: ${displayName}. ${driveStatusMessage}` : `Worker created: ${displayName}`;
      this.resetDraft();
      await this.loadWorkers(false);
    } catch (error: any) {
      this.createError = error?.message || 'Could not create worker.';
    } finally {
      this.isSaving = false;
    }
  }

  async saveWorkerChanges() {
    if (!this.selectedWorker?.id || this.isUpdatingWorker) return;

    this.isUpdatingWorker = true;
    this.saveWorkerMessage = '';
    this.saveWorkerError = '';

    try {
      this.validateWorkerCompliance(this.selectedWorker);
      const worker = this.selectedWorker;
      const firstName = String(worker.firstName ?? '').trim();
      const lastName = String(worker.lastName ?? '').trim();
      const middleName = String(worker.middleName ?? '').trim();
      const displayName = [firstName, middleName, lastName].filter(Boolean).join(' ') || worker.email || worker.id;
      const email = String(worker.email ?? '').trim().toLowerCase();
      const normalizedAccess = this.normalizeAccess(worker.screenAccess, worker.role);
      const isActive = worker.workerStatus === 'active';

      await updateDoc(doc(this.firestore, 'workers', worker.id), {
        firstName,
        middleName,
        lastName,
        displayName,
        email,
        phone: String(worker.phone ?? '').trim(),
        alternatePhone: String(worker.alternatePhone ?? '').trim(),
        preferredLanguage: String(worker.preferredLanguage ?? '').trim(),
        dateOfBirth: String(worker.dateOfBirth ?? '').trim() || null,
        active: isActive,
        workerStatus: String(worker.workerStatus ?? '').trim() || (isActive ? 'active' : 'inactive'),
        areaType: worker.areaType === 'office' ? 'office' : 'field',
        subRole: String(worker.subRole ?? '').trim().toLowerCase() || 'helper',
        employmentType: worker.employmentType === '1099' ? '1099' : 'W2',
        address: {
          line1: String(worker.addressLine1 ?? '').trim(),
          line2: String(worker.addressLine2 ?? '').trim(),
          city: String(worker.city ?? '').trim(),
          state: String(worker.state ?? '').trim().toUpperCase(),
          zip: String(worker.zip ?? '').trim(),
        },
        ssnFull: String(worker.ssnFull ?? '').trim(),
        workAuthorization: {
          status: String(worker.workAuthorizationStatus ?? '').trim().toLowerCase() || 'citizen',
          expirationDate: String(worker.workAuthorizationStatus ?? '').trim().toLowerCase() === 'citizen' ? null : (String(worker.workAuthorizationExpiration ?? '').trim() || null),
        },
        pay: {
          payType: String(worker.payType ?? 'hourly').trim() || 'hourly',
          rate: this.toNumberOrNull(worker.hourlyRate),
          overtimeRate: this.toNumberOrNull(worker.overtimeRate),
          paymentMethod: String(worker.paymentMethod ?? '').trim() || 'payroll',
          bankInfo: this.cloneBankInfo(worker.bankInfo),
        },
        employment: {
          type: worker.employmentType === '1099' ? '1099' : 'W2',
          w2: this.cloneW2Compliance(worker.w2Compliance),
          contractor1099: this.cloneInsuranceCompliance(worker.insuranceCompliance),
        },
        vacation: this.cloneVacation(worker.vacation, worker.hireDate),
        emergencyContact: this.cloneEmergencyContact(worker.emergencyContact),
        notes: String(worker.notes ?? '').trim(),
        hireDate: String(worker.hireDate ?? '').trim() || null,
        rehireDate: String(worker.rehireDate ?? '').trim() || null,
        supervisor: String(worker.supervisor ?? '').trim(),
        passportNumber: String(worker.passportNumber ?? '').trim(),
        residenceNumber: String(worker.residenceNumber ?? '').trim(),
        workPermitNumber: String(worker.workPermitNumber ?? '').trim(),
        canLogin: worker.canLogin === true,
        accessRole: worker.canLogin ? String(worker.role ?? 'worker').trim().toLowerCase() || 'worker' : 'worker',
        updatedAt: serverTimestamp(),
      });

      const photoPatch = await this.uploadWorkerPassportPhoto(worker.id, firstName, lastName, this.selectedWorkerPhoto);
      if (photoPatch) {
        await updateDoc(doc(this.firestore, 'workers', worker.id), photoPatch);
        worker.photoURL = photoPatch.photoURL;
        worker.photoStoragePath = photoPatch.photoStoragePath;
      }

      if (worker.canLogin && worker.linkedAuthUid) {
        const role = String(worker.role ?? '').trim().toLowerCase() || 'worker';
        await updateDoc(doc(this.firestore, 'users', worker.linkedAuthUid), {
          workerId: worker.id,
          email,
          firstName,
          middleName,
          lastName,
          displayName,
          role,
          roles: role === 'admin' ? ['admin'] : [role],
          active: isActive,
          screenAccess: normalizedAccess,
          updatedAt: serverTimestamp(),
        });
      }

      //await this.uploadWorkerDocuments(worker.id, worker.firstName, worker.lastName, this.selectedWorkerDocuments);
      this.saveWorkerMessage = `Worker updated: ${displayName}`;
      this.selectedWorker = null;
      await this.loadWorkers(false);
    } catch (error: any) {
      this.saveWorkerError = error?.message || 'Could not save worker changes.';
    } finally {
      this.isUpdatingWorker = false;
    }
  }

  resetDraft() {
    this.clearPhotoDraft(this.draftPhoto);
    this.draftPhoto = this.createEmptyPhotoDraft();
    this.draftWorker = this.createEmptyDraft();
    this.draftDocuments = this.createDefaultDocumentDrafts();
    this.scheduleDraftDocumentInputSync();
    this.clearCandidateSelection();
  }

  closeMenus() {
    this.isCandidateSearchOpen = false;
  }

  getComplianceSummary(worker: ManagedWorkerView | any): string {
    if (!worker) return 'Not set';
    if (worker.employmentType === '1099') {
      const parts: string[] = [];
      if (worker.insuranceCompliance?.hasWorkersComp) parts.push('Workers Comp');
      if (worker.insuranceCompliance?.exemptionProvided) parts.push('Exemption');
      if (worker.insuranceCompliance?.hasLiabilityInsurance) parts.push('Liability');
      return parts.length ? parts.join(' · ') : '1099 compliance missing';
    }

    const w2 = worker.w2Compliance || {};
    const done = [w2.taxFormCompleted, w2.i9Completed, w2.eVerifyCompleted, w2.payrollSetup].filter(Boolean).length;
    return `W2 onboarding ${done}/4`;
  }

  private validateWorkerCompliance(worker: ManagedWorkerView | any) {
    const employmentType = String(worker?.employmentType ?? 'W2').trim().toUpperCase();
    if (employmentType === '1099') {
      const insurance = worker?.insuranceCompliance;
      const hasWorkersComp = insurance?.hasWorkersComp === true;
      const hasExemption = insurance?.exemptionProvided === true;
      if (!hasWorkersComp && !hasExemption) {
        throw new Error('A 1099 worker must have Workers Comp or an exemption on file.');
      }
    }
  }

  private createEmptyDraft() {
    return {
      firstName: '',
      middleName: '',
      lastName: '',
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
      canLogin: false,
      password: '',
      role: 'worker',
      screenAccess: {
        overview: true,
        construction: false,
        workers: false,
        humanResources: false,
        companies: false,
        settings: false,
        shop: false,
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
      .replace(/^-+|-+$/g, '') || 'worker';
  }

  private async uploadWorkerPassportPhoto(
    workerId: string,
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
    const safeName = `${this.sanitizeFileSegment(lastName)}-${this.sanitizeFileSegment(firstName) || 'worker'}`;
    const storagePath = `workers/${workerId}/passport-photo/${safeName}.${extension}`;
    const storageRef = ref(this.storage, storagePath);

    await uploadBytes(storageRef, photoDraft.file, {
      contentType: photoDraft.file.type || 'image/jpeg',
      customMetadata: {
        workerId,
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

  private async searchCandidateOptions() {
    const term = this.candidateSearchTerm.trim();
    const requestId = ++this.candidateSearchRequestId;

    if (!term) {
      this.candidateSearchResults = [];
      this.candidateSearchError = '';
      this.isSearchingCandidates = false;
      this.isCandidateSearchOpen = false;
      return;
    }

    this.isSearchingCandidates = true;

    try {
      const results = await this.candidateSearchService.searchCandidates(term);
      if (requestId !== this.candidateSearchRequestId) {
        return;
      }

      this.candidateSearchResults = results;
      this.candidateSearchError = '';
      this.isCandidateSearchOpen = true;
    } catch (error: unknown) {
      if (requestId !== this.candidateSearchRequestId) {
        return;
      }

      this.candidateSearchResults = [];
      this.candidateSearchError = error instanceof Error ? error.message : 'Could not search candidates.';
      this.isCandidateSearchOpen = true;
    } finally {
      if (requestId === this.candidateSearchRequestId) {
        this.isSearchingCandidates = false;
      }
    }
  }

  private applyCandidateToDraft(candidate: CandidateSearchResult, data: Record<string, unknown>) {
    const address = this.readRecord(data['address']);
    const workAuthorization = this.readRecord(data['workAuthorization']);
    const pay = this.readRecord(data['pay']);
    const bankInfo = this.readRecord(pay['bankInfo']);
    const employment = this.readRecord(data['employment']);
    const w2 = this.readRecord(employment['w2']);
    const contractor1099 = this.readRecord(employment['contractor1099']);
    const emergencyContact = this.readRecord(data['emergencyContact']);
    const vacation = this.readRecord(data['vacation']);
    const vacationPolicy = this.readRecord(vacation['policy']);
    const vacationBalance = this.readRecord(vacation['balance']);
    const vacationTracking = this.readRecord(vacation['tracking']);
    const nextDraft = this.createEmptyDraft();

    nextDraft.firstName = this.readString(data['firstName']) || candidate.firstName;
    nextDraft.middleName = this.readString(data['middleName']) || candidate.middleName;
    nextDraft.lastName = this.readString(data['lastName']) || candidate.lastName;
    nextDraft.email = this.readString(data['email']) || candidate.email;
    nextDraft.phone = this.readString(data['phone']) || candidate.phone;
    nextDraft.alternatePhone = this.readString(data['alternatePhone']) || candidate.alternatePhone;
    nextDraft.preferredLanguage = this.readString(data['preferredLanguage']) || 'english';
    nextDraft.dateOfBirth = this.readString(data['dateOfBirth']);
    nextDraft.areaType = this.readString(data['areaType']).toLowerCase() === 'office' ? 'office' : 'field';
    nextDraft.subRole = this.readString(data['subRole']).toLowerCase() || candidate.subRole || (nextDraft.areaType === 'office' ? 'secretary' : 'helper');
    nextDraft.employmentType = this.readString(data['employmentType']).toUpperCase() === '1099' ? '1099' : 'W2';
    nextDraft.addressLine1 = this.readString(address['line1']);
    nextDraft.addressLine2 = this.readString(address['line2']);
    nextDraft.city = this.readString(address['city']);
    nextDraft.state = this.readString(address['state']) || 'FL';
    nextDraft.zip = this.readString(address['zip']);
    nextDraft.ssnFull = this.readString(data['ssnFull']);
    nextDraft.workAuthorizationStatus = this.readString(workAuthorization['status']).toLowerCase() || 'citizen';
    nextDraft.workAuthorizationExpiration = nextDraft.workAuthorizationStatus === 'citizen' ? '' : this.readString(workAuthorization['expirationDate']);
    nextDraft.passportNumber = this.readString(data['passportNumber']);
    nextDraft.residenceNumber = this.readString(data['residenceNumber']);
    nextDraft.workPermitNumber = this.readString(data['workPermitNumber']);
    nextDraft.hireDate = this.readString(data['hireDate']);
    nextDraft.rehireDate = this.readString(data['rehireDate']);
    nextDraft.supervisor = this.readString(data['supervisor']) || candidate.supervisor;
    nextDraft.payType = this.readString(pay['payType']) || 'hourly';
    nextDraft.hourlyRate = this.toNumberOrNull(pay['rate']) ?? '';
    nextDraft.overtimeRate = this.toNumberOrNull(pay['overtimeRate']) ?? '';
    nextDraft.paymentMethod = this.readString(pay['paymentMethod']) || 'payroll';
    nextDraft.bankInfo = {
      bankName: this.readString(bankInfo['bankName']),
      accountType: this.readString(bankInfo['accountType']) || 'checking',
      routingNumber: this.readString(bankInfo['routingNumber']),
      accountNumber: this.readString(bankInfo['accountNumber']),
      accountHolderName: this.readString(bankInfo['accountHolderName']),
    };
    nextDraft.w2Compliance = {
      payrollSetup: w2['payrollSetup'] === true,
      taxFormCompleted: w2['taxFormCompleted'] === true,
      i9Completed: w2['i9Completed'] === true,
      eVerifyCompleted: w2['eVerifyCompleted'] === true,
      eVerifyCaseNumber: this.readString(w2['eVerifyCaseNumber']),
      eVerifyDate: this.readString(w2['eVerifyDate']),
    };
    nextDraft.insuranceCompliance = {
      hasWorkersComp: contractor1099['hasWorkersComp'] === true,
      workersCompPolicyNumber: this.readString(contractor1099['workersCompPolicyNumber']),
      workersCompExpiration: this.readString(contractor1099['workersCompExpiration']),
      exemptionProvided: contractor1099['exemptionProvided'] === true,
      exemptionType: this.readString(contractor1099['exemptionType']) || 'none',
      exemptionExpiration: this.readString(contractor1099['exemptionExpiration']),
      hasLiabilityInsurance: contractor1099['hasLiabilityInsurance'] === true,
      liabilityPolicyNumber: this.readString(contractor1099['liabilityPolicyNumber']),
      liabilityExpiration: this.readString(contractor1099['liabilityExpiration']),
      companyName: this.readString(contractor1099['companyName']),
      ein: this.readString(contractor1099['ein']),
    };
    nextDraft.emergencyContact = {
      name: this.readString(emergencyContact['name']),
      relationship: this.readString(emergencyContact['relationship']),
      phone: this.readString(emergencyContact['phone']),
    };
    nextDraft.vacation = this.cloneVacation({
      policy: {
        enabled: vacationPolicy['enabled'] === true || vacation['eligible'] === true,
        ptoEligible: vacationPolicy['ptoEligible'] === true || vacation['ptoEligible'] === true,
        accrualMethod: this.readString(vacationPolicy['accrualMethod'] || vacation['accrualMethod']) || 'annual',
        annualDays: this.toNumberOrNull(vacationPolicy['annualDays'] ?? vacation['annualDays']),
        eligibilityMonths: this.toNumberOrNull(vacationPolicy['eligibilityMonths'] ?? 12),
        allowCarryover: vacationPolicy['allowCarryover'] === true,
        maxCarryoverDays: this.toNumberOrNull(vacationPolicy['maxCarryoverDays']),
      },
      balance: {
        grantedDays: this.toNumberOrNull(vacationBalance['grantedDays']),
        usedDays: this.toNumberOrNull(vacationBalance['usedDays'] ?? vacation['usedDays']),
        pendingDays: this.toNumberOrNull(vacationBalance['pendingDays']),
        carryoverDays: this.toNumberOrNull(vacationBalance['carryoverDays'] ?? vacation['carryoverDays']),
        sickDays: this.toNumberOrNull(vacationBalance['sickDays'] ?? vacation['sickDays']),
        availableDays: this.toNumberOrNull(vacationBalance['availableDays'] ?? vacation['availableDays']),
      },
      tracking: {
        eligibleFrom: this.readString(vacationTracking['eligibleFrom']),
        lastGrantedAt: this.readString(vacationTracking['lastGrantedAt'] ?? vacation['lastVacationDate']),
        nextGrantAt: this.readString(vacationTracking['nextGrantAt']),
        lastUsedAt: this.readString(vacationTracking['lastUsedAt'] ?? vacation['lastVacationDate']),
        nextPlannedVacationDate: this.readString(vacationTracking['nextPlannedVacationDate'] ?? vacation['nextPlannedVacationDate']),
        historyEntries: this.toNumberOrNull(vacationTracking['historyEntries']),
      },
    }, nextDraft.hireDate);
    nextDraft.notes = this.readString(data['notes']);
    nextDraft.photoURL = this.readString(data['photoURL']);
    nextDraft.photoStoragePath = this.readString(data['photoStoragePath']);

    const availableSubRoles = this.getSubRoleOptions(nextDraft.areaType);
    if (!availableSubRoles.includes(nextDraft.subRole as any)) {
      nextDraft.subRole = availableSubRoles[0] ?? '';
    }

    if (nextDraft.employmentType === '1099') {
      nextDraft.payType = nextDraft.payType || 'hourly';
      nextDraft.overtimeRate = '';
      nextDraft.w2Compliance = this.createDefaultW2Compliance();
      if (nextDraft.paymentMethod === 'payroll') {
        nextDraft.paymentMethod = '1099_invoice';
      }
    } else {
      const overtimeRate = this.toNumberOrNull(nextDraft.overtimeRate);
      const baseRate = this.toNumberOrNull(nextDraft.hourlyRate);
      nextDraft.overtimeRate = overtimeRate ?? (baseRate !== null ? Number((baseRate * 1.5).toFixed(2)) : '');
    }

    this.clearPhotoDraft(this.draftPhoto);
    this.draftWorker = nextDraft;
    this.draftPhoto = {
      file: null,
      previewUrl: nextDraft.photoURL,
      storagePath: nextDraft.photoStoragePath,
    };
    this.draftDocuments = this.createDefaultDocumentDrafts();
    this.scheduleDraftDocumentInputSync();
  }

  private async hydrateSelectedCandidateDocuments(candidate: CandidateSearchResult, requestId: number) {
    try {
      const candidateDocuments = candidate.documents.length > 0
        ? candidate.documents
        : await this.candidateSearchService.loadCandidateDocuments(candidate.id);

      if (requestId !== this.candidateSelectionRequestId) {
        return;
      }

      this.selectedCandidateDocuments = candidateDocuments;
      await this.loadCandidateDocumentsIntoDraft(candidateDocuments, requestId);
    } catch (error: unknown) {
      if (requestId === this.candidateSelectionRequestId) {
        this.candidateSearchError = error instanceof Error ? error.message : 'Could not load the selected candidate documents.';
      }
    } finally {
      if (requestId === this.candidateSelectionRequestId) {
        this.isLoadingSelectedCandidateDocuments = false;
      }
    }
  }

  private async loadCandidateDocumentsIntoDraft(documents: CandidateSearchDocument[], requestId: number) {
    const draftDocuments = this.createDefaultDocumentDrafts();

    const loadedFiles = await Promise.all(
      documents.map(async (document) => ({
        document,
        file: await this.candidateSearchService.loadCandidateDocumentFile(document),
      }))
    );

    if (requestId !== this.candidateSelectionRequestId) {
      return;
    }

    for (const loadedDocument of loadedFiles) {
      if (!loadedDocument.file) {
        continue;
      }

      const target = draftDocuments.find((item) => item.type === loadedDocument.document.type) ?? draftDocuments.find((item) => item.type === 'other');
      if (!target) {
        continue;
      }

      target.files = [...target.files, loadedDocument.file];
    }

    this.draftDocuments = draftDocuments;
    this.scheduleDraftDocumentInputSync();
  }

  private scheduleDraftDocumentInputSync() {
    setTimeout(() => this.syncDraftDocumentInputs(), 0);
  }

  private syncDraftDocumentInputs() {
    if (!this.draftDocumentInputs) {
      return;
    }

    for (const inputRef of this.draftDocumentInputs.toArray()) {
      const input = inputRef.nativeElement;
      const documentType = input.dataset['documentType'] ?? '';
      const draftDocument = this.draftDocuments.find((item) => item.type === documentType);

      if (!draftDocument || draftDocument.files.length === 0) {
        input.value = '';
        continue;
      }

      if (typeof DataTransfer === 'undefined') {
        continue;
      }

      const dataTransfer = new DataTransfer();
      for (const file of draftDocument.files) {
        dataTransfer.items.add(file);
      }

      try {
        input.files = dataTransfer.files;
      } catch {
        input.value = '';
      }
    }
  }

  private readRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private hasSearchTerm(): boolean {
    return this.searchTerm.trim().length > 0;
  }

  private async countWorkers(): Promise<number> {
    const snapshot = await getCountFromServer(collection(this.firestore, 'workers'));
    return snapshot.data().count;
  }

  private async countWorkersByTerm(term: string): Promise<number> {
    const criteria = this.normalizeWorkerSearchCriteria(term);
    if (criteria.length === 0) {
      return 0;
    }

    let total = 0;
    let cursor: QueryDocumentSnapshot<DocumentData> | null = null;

    while (true) {
      const searchResult = await this.loadMatchingWorkerPage(criteria, this.searchBatchSize, cursor);
      total += searchResult.workers.length;

      if (!searchResult.hasMore || !searchResult.lastVisible) {
        return total;
      }

      cursor = searchResult.lastVisible;
    }
  }

  private resetPagedCache(): void {
    this.pageCache.clear();
    this.pageStartCursors.clear();
    this.pageStartCursors.set(1, null);
    this.workers = [];
    this.filteredWorkers = [];
  }

  private resetSearchCache(): void {
    this.searchPageCache.clear();
    this.searchPageStartCursors.clear();
    this.searchPageStartCursors.set(1, null);
    this.filteredWorkers = [];
    this.activeSearchTerm = '';
  }

  private async loadPage(page: number): Promise<void> {
    const cachedPage = this.pageCache.get(page);
    if (cachedPage) {
      this.currentPage = page;
      this.workers = [...cachedPage];
      this.filteredWorkers = [...cachedPage];
      return;
    }

    const startCursor = await this.ensurePageCursor(page);
    const workersSnap = await getDocs(this.buildWorkerQuery(this.pageSize, startCursor));
    const userMap = await this.loadLinkedUsersMap(workersSnap.docs.map((snap) => snap.data() as Record<string, unknown>));
    const pageWorkers = workersSnap.docs.map((snap) => this.mapWorkerDoc(snap.id, snap.data() as any, userMap));
    this.pageCache.set(page, pageWorkers);
    this.pageStartCursors.set(page + 1, workersSnap.docs.at(-1) ?? null);
    this.currentPage = page;
    this.workers = pageWorkers;
    this.filteredWorkers = [...pageWorkers];
  }

  private async loadSearchPage(term: string, page: number): Promise<void> {
    const cachedPage = this.searchPageCache.get(page);
    if (cachedPage) {
      this.currentPage = page;
      this.filteredWorkers = [...cachedPage];
      return;
    }

    const startCursor = await this.ensureSearchPageCursor(term, page);
    const criteria = this.normalizeWorkerSearchCriteria(term);
    const searchResult = await this.loadMatchingWorkerPage(criteria, this.pageSize, startCursor);
    const pageWorkers = searchResult.workers;
    this.searchPageCache.set(page, pageWorkers);
    this.searchPageStartCursors.set(page + 1, searchResult.lastVisible);
    this.currentPage = page;
    this.filteredWorkers = pageWorkers;
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

      const workersSnap = await getDocs(this.buildWorkerQuery(this.pageSize, currentCursor));
      const userMap = await this.loadLinkedUsersMap(workersSnap.docs.map((snap) => snap.data() as Record<string, unknown>));
      const pageWorkers = workersSnap.docs.map((snap) => this.mapWorkerDoc(snap.id, snap.data() as any, userMap));
      this.pageCache.set(currentPage, pageWorkers);
      this.pageStartCursors.set(currentPage + 1, workersSnap.docs.at(-1) ?? null);
      currentCursor = workersSnap.docs.at(-1) ?? null;
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
    const criteria = this.normalizeWorkerSearchCriteria(term);

    while (currentPage < page) {
      const cachedCursor = this.searchPageStartCursors.get(currentPage + 1);
      if (cachedCursor !== undefined) {
        currentCursor = cachedCursor;
        currentPage += 1;
        continue;
      }

      const searchResult = await this.loadMatchingWorkerPage(criteria, this.pageSize, currentCursor);
      const pageWorkers = searchResult.workers;
      this.searchPageCache.set(currentPage, pageWorkers);
      this.searchPageStartCursors.set(currentPage + 1, searchResult.lastVisible);
      currentCursor = searchResult.lastVisible;
      currentPage += 1;
    }

    return this.searchPageStartCursors.get(page) ?? null;
  }

  private buildWorkerQuery(
    pageSize?: number,
    after?: QueryDocumentSnapshot<DocumentData> | null,
  ) {
    const constraints: QueryConstraint[] = [];
    constraints.push(orderBy('displayName'));

    if (after) {
      constraints.push(startAfter(after));
    }

    if (pageSize) {
      constraints.push(limit(pageSize));
    }

    return query(collection(this.firestore, 'workers'), ...constraints);
  }

  private async loadLinkedUsersMap(workerDocs: Record<string, unknown>[]): Promise<Map<string, any>> {
    const linkedAuthUids = [...new Set(
      workerDocs
        .map((data) => String(data['linkedAuthUid'] ?? '').trim())
        .filter(Boolean)
    )];

    if (linkedAuthUids.length === 0) {
      return new Map<string, any>();
    }

    const userEntries = await Promise.all(
      linkedAuthUids.map(async (linkedAuthUid) => {
        const userSnapshot = await getDoc(doc(this.firestore, 'users', linkedAuthUid));
        return [linkedAuthUid, userSnapshot.exists() ? userSnapshot.data() : null] as const;
      })
    );

    return new Map(userEntries.filter(([, userData]) => userData));
  }


  private async loadMatchingWorkerPage(
    criteria: string[],
    pageSize: number,
    after?: QueryDocumentSnapshot<DocumentData> | null,
  ): Promise<{ workers: ManagedWorkerView[]; lastVisible: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean }> {
    const matches: ManagedWorkerView[] = [];
    let cursor = after ?? null;

    while (matches.length < pageSize) {
      const workersSnap = await getDocs(this.buildWorkerQuery(this.searchBatchSize, cursor));
      if (workersSnap.empty) {
        return {
          workers: matches,
          lastVisible: cursor,
          hasMore: false,
        };
      }

      const workerDocs = workersSnap.docs.map((snap) => snap.data() as Record<string, unknown>);
      const userMap = await this.loadLinkedUsersMap(workerDocs);

      for (const snap of workersSnap.docs) {
        const worker = this.mapWorkerDoc(snap.id, snap.data() as any, userMap);
        cursor = snap;

        if (!this.matchesWorkerSearchCriteria(worker, criteria)) {
          continue;
        }

        matches.push(worker);
        if (matches.length === pageSize) {
          return {
            workers: matches,
            lastVisible: cursor,
            hasMore: true,
          };
        }
      }
    }

    return {
      workers: matches,
      lastVisible: cursor,
      hasMore: true,
    };
  }

  private matchesWorkerSearchCriteria(worker: ManagedWorkerView, criteria: string[]): boolean {
    const searchValues = this.getWorkerSearchValues(worker).flatMap((value) => this.toWorkerSearchVariants(value));
    return criteria.every((criterion) => searchValues.some((value) => value.includes(criterion)));
  }

  private getWorkerSearchValues(worker: ManagedWorkerView): string[] {
    const enabledScreens = Object.entries(worker.screenAccess)
      .filter(([, enabled]) => enabled)
      .map(([screen]) => screen);

    return [
      worker.workerId,
      worker.displayName,
      worker.firstName,
      worker.middleName,
      worker.lastName,
      worker.email,
      worker.phone,
      worker.alternatePhone,
      worker.preferredLanguage,
      worker.dateOfBirth,
      worker.workerStatus,
      worker.active ? 'active' : 'inactive',
      worker.areaType,
      worker.subRole,
      worker.employmentType,
      worker.addressLine1,
      worker.addressLine2,
      worker.city,
      worker.state,
      worker.zip,
      worker.ssnFull,
      worker.workAuthorizationStatus,
      worker.workAuthorizationExpiration,
      worker.hireDate,
      worker.rehireDate,
      worker.supervisor,
      worker.payType,
      worker.paymentMethod,
      worker.bankInfo.bankName,
      worker.bankInfo.accountType,
      worker.bankInfo.routingNumber,
      worker.bankInfo.accountNumber,
      worker.bankInfo.accountHolderName,
      worker.role,
      ...enabledScreens,
      worker.w2Compliance.eVerifyCaseNumber,
      worker.w2Compliance.eVerifyDate,
      worker.insuranceCompliance.workersCompPolicyNumber,
      worker.insuranceCompliance.workersCompExpiration,
      worker.insuranceCompliance.exemptionType,
      worker.insuranceCompliance.exemptionExpiration,
      worker.insuranceCompliance.liabilityPolicyNumber,
      worker.insuranceCompliance.liabilityExpiration,
      worker.insuranceCompliance.companyName,
      worker.insuranceCompliance.ein,
      worker.vacation.tracking.eligibleFrom,
      worker.vacation.tracking.lastGrantedAt,
      worker.vacation.tracking.nextGrantAt,
      worker.vacation.tracking.lastUsedAt,
      worker.vacation.tracking.nextPlannedVacationDate,
      worker.emergencyContact.name,
      worker.emergencyContact.relationship,
      worker.emergencyContact.phone,
      worker.notes,
    ];
  }

  private toWorkerSearchVariants(value: string): string[] {
    const normalized = this.normalizeWorkerSearchValue(value);
    if (!normalized) {
      return [];
    }

    const compact = normalized.replace(/[^a-z0-9@.]+/g, '');
    return compact && compact !== normalized ? [normalized, compact] : [normalized];
  }

  private normalizeWorkerSearchCriteria(value: string): string[] {
    return this.normalizeWorkerSearchValue(value)
      .split(/\s+/)
      .filter(Boolean);
  }

  private normalizeWorkerSearchValue(value: string): string {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[_\-/\\(),.]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private mapWorkerDoc(id: string, data: any, userMap: Map<string, any>): ManagedWorkerView {
    const linkedAuthUid = String(data?.linkedAuthUid ?? '').trim() || null;
    const linkedUser = linkedAuthUid ? userMap.get(linkedAuthUid) : null;
    const firstName = String(data?.firstName ?? '').trim();
    const lastName = String(data?.lastName ?? '').trim();
    const email = String(data?.email ?? linkedUser?.email ?? '').trim().toLowerCase();
    const displayName = String(data?.displayName ?? '').trim() || [firstName, lastName].filter(Boolean).join(' ') || email || id;

    const employmentType = String(data?.employmentType ?? data?.employment?.type ?? 'W2').trim().toUpperCase() === '1099' ? '1099' : 'W2';

    return {
      id,
      workerId: String(data?.workerId ?? id),
      linkedAuthUid,
      canLogin: data?.canLogin === true || !!linkedAuthUid,
      firstName,
      middleName: String(data?.middleName ?? '').trim(),
      lastName,
      displayName,
      email,
      phone: String(data?.phone ?? '').trim(),
      alternatePhone: String(data?.alternatePhone ?? '').trim(),
      preferredLanguage: String(data?.preferredLanguage ?? '').trim() || 'english',
      dateOfBirth: String(data?.dateOfBirth ?? '').trim(),
      active: String(data?.workerStatus ?? '').trim() ? String(data?.workerStatus ?? '').trim() === 'active' : data?.active !== false,
      workerStatus: String(data?.workerStatus ?? '').trim() || (data?.active !== false ? 'active' : 'inactive'),
      areaType: String(data?.areaType ?? 'field').trim().toLowerCase() === 'office' ? 'office' : 'field',
      subRole: String(data?.subRole ?? '').trim().toLowerCase() || 'helper',
      employmentType,
      addressLine1: String(data?.address?.line1 ?? '').trim(),
      addressLine2: String(data?.address?.line2 ?? '').trim(),
      city: String(data?.address?.city ?? '').trim(),
      state: String(data?.address?.state ?? '').trim().toUpperCase(),
      zip: String(data?.address?.zip ?? '').trim(),
      ssnFull: String(data?.ssnFull ?? data?.ssnLast4 ?? '').trim(),
      workAuthorizationStatus: String(data?.workAuthorization?.status ?? '').trim().toLowerCase() || 'citizen',
      workAuthorizationExpiration: String(data?.workAuthorization?.expirationDate ?? '').trim(),
      passportNumber: String(data?.passportNumber ?? '').trim(),
      residenceNumber: String(data?.residenceNumber ?? '').trim(),
      workPermitNumber: String(data?.workPermitNumber ?? '').trim(),
      hireDate: String(data?.hireDate ?? '').trim(),
      rehireDate: String(data?.rehireDate ?? '').trim(),
      supervisor: String(data?.supervisor ?? '').trim(),
      payType: String(data?.pay?.payType ?? 'hourly').trim() || 'hourly',
      hourlyRate: this.toNumberOrNull(data?.pay?.rate),
      overtimeRate: this.toNumberOrNull(data?.pay?.overtimeRate),
      paymentMethod: String(data?.pay?.paymentMethod ?? 'payroll').trim() || 'payroll',
      bankInfo: {
        bankName: String(data?.pay?.bankInfo?.bankName ?? '').trim(),
        accountType: String(data?.pay?.bankInfo?.accountType ?? 'checking').trim() || 'checking',
        routingNumber: String(data?.pay?.bankInfo?.routingNumber ?? '').trim(),
        accountNumber: String(data?.pay?.bankInfo?.accountNumber ?? '').trim(),
        accountHolderName: String(data?.pay?.bankInfo?.accountHolderName ?? '').trim(),
      },
      role: String(linkedUser?.role ?? data?.accessRole ?? 'worker').trim().toLowerCase() || 'worker',
      screenAccess: this.normalizeAccess(linkedUser?.screenAccess, String(linkedUser?.role ?? data?.accessRole ?? 'worker')),
      w2Compliance: {
        payrollSetup: data?.employment?.w2?.payrollSetup === true,
        taxFormCompleted: data?.employment?.w2?.taxFormCompleted === true,
        i9Completed: data?.employment?.w2?.i9Completed === true,
        eVerifyCompleted: data?.employment?.w2?.eVerifyCompleted === true,
        eVerifyCaseNumber: String(data?.employment?.w2?.eVerifyCaseNumber ?? '').trim(),
        eVerifyDate: String(data?.employment?.w2?.eVerifyDate ?? '').trim(),
      },
      insuranceCompliance: {
        hasWorkersComp: data?.employment?.contractor1099?.hasWorkersComp === true,
        workersCompPolicyNumber: String(data?.employment?.contractor1099?.workersCompPolicyNumber ?? '').trim(),
        workersCompExpiration: String(data?.employment?.contractor1099?.workersCompExpiration ?? '').trim(),
        exemptionProvided: data?.employment?.contractor1099?.exemptionProvided === true,
        exemptionType: String(data?.employment?.contractor1099?.exemptionType ?? '').trim(),
        exemptionExpiration: String(data?.employment?.contractor1099?.exemptionExpiration ?? '').trim(),
        hasLiabilityInsurance: data?.employment?.contractor1099?.hasLiabilityInsurance === true,
        liabilityPolicyNumber: String(data?.employment?.contractor1099?.liabilityPolicyNumber ?? '').trim(),
        liabilityExpiration: String(data?.employment?.contractor1099?.liabilityExpiration ?? '').trim(),
        companyName: String(data?.employment?.contractor1099?.companyName ?? '').trim(),
        ein: String(data?.employment?.contractor1099?.ein ?? '').trim(),
      },
      vacation: this.cloneVacation({
        policy: {
          enabled: data?.vacation?.policy?.enabled === true || data?.vacation?.eligible === true,
          ptoEligible: data?.vacation?.policy?.ptoEligible === true || data?.vacation?.ptoEligible === true,
          accrualMethod: String(data?.vacation?.policy?.accrualMethod ?? data?.vacation?.accrualMethod ?? 'annual').trim() || 'annual',
          annualDays: this.toNumberOrNull(data?.vacation?.policy?.annualDays ?? data?.vacation?.annualDays),
          eligibilityMonths: this.toNumberOrNull(data?.vacation?.policy?.eligibilityMonths ?? 12),
          allowCarryover: data?.vacation?.policy?.allowCarryover === true,
          maxCarryoverDays: this.toNumberOrNull(data?.vacation?.policy?.maxCarryoverDays),
        },
        balance: {
          grantedDays: this.toNumberOrNull(data?.vacation?.balance?.grantedDays),
          usedDays: this.toNumberOrNull(data?.vacation?.balance?.usedDays ?? data?.vacation?.usedDays),
          pendingDays: this.toNumberOrNull(data?.vacation?.balance?.pendingDays),
          carryoverDays: this.toNumberOrNull(data?.vacation?.balance?.carryoverDays ?? data?.vacation?.carryoverDays),
          sickDays: this.toNumberOrNull(data?.vacation?.balance?.sickDays ?? data?.vacation?.sickDays),
          availableDays: this.toNumberOrNull(data?.vacation?.balance?.availableDays ?? data?.vacation?.availableDays),
        },
        tracking: {
          eligibleFrom: String(data?.vacation?.tracking?.eligibleFrom ?? '').trim(),
          lastGrantedAt: String(data?.vacation?.tracking?.lastGrantedAt ?? data?.vacation?.lastVacationDate ?? '').trim(),
          nextGrantAt: String(data?.vacation?.tracking?.nextGrantAt ?? '').trim(),
          lastUsedAt: String(data?.vacation?.tracking?.lastUsedAt ?? data?.vacation?.lastVacationDate ?? '').trim(),
          nextPlannedVacationDate: String(data?.vacation?.tracking?.nextPlannedVacationDate ?? data?.vacation?.nextPlannedVacationDate ?? '').trim(),
          historyEntries: this.toNumberOrNull(data?.vacation?.tracking?.historyEntries),
        },
      }, data?.hireDate),
      emergencyContact: {
        name: String(data?.emergencyContact?.name ?? '').trim(),
        relationship: String(data?.emergencyContact?.relationship ?? '').trim(),
        phone: String(data?.emergencyContact?.phone ?? '').trim(),
      },
      notes: String(data?.notes ?? '').trim(),
      photoURL: String(data?.photoURL ?? '').trim(),
      photoStoragePath: String(data?.photoStoragePath ?? '').trim(),
    };
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

  private createDefaultVacation(): VacationView {
    return this.cloneVacation({
      policy: {
        enabled: false,
        ptoEligible: false,
        accrualMethod: 'annual',
        annualDays: 5,
        eligibilityMonths: 12,
        allowCarryover: false,
        maxCarryoverDays: 0,
      },
      balance: {
        grantedDays: 0,
        usedDays: 0,
        pendingDays: 0,
        carryoverDays: 0,
        sickDays: 0,
        availableDays: 0,
      },
      tracking: {
        eligibleFrom: '',
        lastGrantedAt: '',
        nextGrantAt: '',
        lastUsedAt: '',
        nextPlannedVacationDate: '',
        historyEntries: 0,
      },
    });
  }

  private createDefaultEmergencyContact(): EmergencyContactView {
    return {
      name: '',
      relationship: '',
      phone: '',
    };
  }

  private cloneW2Compliance(value: W2ComplianceView): W2ComplianceView {
    return {
      payrollSetup: value?.payrollSetup === true,
      taxFormCompleted: value?.taxFormCompleted === true,
      i9Completed: value?.i9Completed === true,
      eVerifyCompleted: value?.eVerifyCompleted === true,
      eVerifyCaseNumber: String(value?.eVerifyCaseNumber ?? '').trim(),
      eVerifyDate: String(value?.eVerifyDate ?? '').trim(),
    };
  }

  private cloneInsuranceCompliance(value: InsuranceComplianceView): InsuranceComplianceView {
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

  private cloneVacation(value: VacationView, hireDate?: string): VacationView {
    const enabled = value?.policy?.enabled === true;
    const ptoEligible = value?.policy?.ptoEligible === true;
    const accrualMethod = String(value?.policy?.accrualMethod ?? 'annual').trim() || 'annual';
    const annualDays = this.toNumberOrNull(value?.policy?.annualDays);
    const eligibilityMonths = this.toNumberOrNull(value?.policy?.eligibilityMonths);
    const allowCarryover = value?.policy?.allowCarryover === true;
    const maxCarryoverDays = this.toNumberOrNull(value?.policy?.maxCarryoverDays);
    const usedDays = this.toNumberOrNull(value?.balance?.usedDays) ?? 0;
    const pendingDays = this.toNumberOrNull(value?.balance?.pendingDays) ?? 0;
    let carryoverDays = this.toNumberOrNull(value?.balance?.carryoverDays) ?? 0;
    const sickDays = this.toNumberOrNull(value?.balance?.sickDays) ?? 0;
    const historyEntries = this.toNumberOrNull(value?.tracking?.historyEntries) ?? 0;

    if (!allowCarryover) {
      carryoverDays = 0;
    } else if (maxCarryoverDays !== null) {
      carryoverDays = Math.min(carryoverDays, Math.max(0, maxCarryoverDays));
    }

    const eligibleFrom = this.addMonthsToDateString(hireDate || '', eligibilityMonths) || String(value?.tracking?.eligibleFrom ?? '').trim();
    const isEligible = enabled && !!eligibleFrom && this.isDateOnOrBeforeToday(eligibleFrom);
    const grantedDays = enabled && isEligible ? (annualDays ?? 0) : 0;
    const availableDays = Math.max(0, grantedDays + carryoverDays - usedDays - pendingDays);
    const lastGrantedAt = enabled && isEligible ? (String(value?.tracking?.lastGrantedAt ?? '').trim() || eligibleFrom) : '';
    const nextGrantAt = lastGrantedAt ? this.addMonthsToDateString(lastGrantedAt, 12) : '';

    return {
      policy: {
        enabled,
        ptoEligible,
        accrualMethod,
        annualDays,
        eligibilityMonths,
        allowCarryover,
        maxCarryoverDays,
      },
      balance: {
        grantedDays,
        usedDays,
        pendingDays,
        carryoverDays,
        sickDays,
        availableDays,
      },
      tracking: {
        eligibleFrom,
        lastGrantedAt,
        nextGrantAt,
        lastUsedAt: String(value?.tracking?.lastUsedAt ?? '').trim(),
        nextPlannedVacationDate: String(value?.tracking?.nextPlannedVacationDate ?? '').trim(),
        historyEntries,
      },
    };
  }

  private addMonthsToDateString(dateString: string, months: number | null): string {
    const normalized = String(dateString ?? '').trim();
    if (!normalized || months === null) return '';
    const base = new Date(`${normalized}T00:00:00`);
    if (Number.isNaN(base.getTime())) return '';
    base.setMonth(base.getMonth() + months);
    return base.toISOString().slice(0, 10);
  }

  private isDateOnOrBeforeToday(dateString: string): boolean {
    const normalized = String(dateString ?? '').trim();
    if (!normalized) return false;
    const check = new Date(`${normalized}T00:00:00`);
    if (Number.isNaN(check.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return check.getTime() <= today.getTime();
  }

  private createDefaultBankInfo(): BankInfoView {
    return { bankName: '', accountType: 'checking', routingNumber: '', accountNumber: '', accountHolderName: '' };
  }

  private cloneBankInfo(value: BankInfoView | undefined): BankInfoView {
    return {
      bankName: String(value?.bankName ?? '').trim(),
      accountType: String(value?.accountType ?? 'checking').trim() || 'checking',
      routingNumber: String(value?.routingNumber ?? '').trim(),
      accountNumber: String(value?.accountNumber ?? '').trim(),
      accountHolderName: String(value?.accountHolderName ?? '').trim(),
    };
  }

  private createDefaultDocumentDrafts(): WorkerDocumentView[] {
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
    return options.map((item) => ({ type: item.type, label: item.label, files: [] }));
  }


  private buildWorkerFolderName(
    firstName: string,
    lastName: string,
    mode: 'last_first' | 'first_last' | 'last_only' | 'first_only' = 'last_first'
  ): string {
    const first = String(firstName || '').trim().toUpperCase();
    const last = String(lastName || '').trim().toUpperCase();

    switch (mode) {
      case 'first_last':
        return [first, last].filter(Boolean).join(' ').trim();
      case 'last_only':
        return last || first;
      case 'first_only':
        return first || last;
      case 'last_first':
      default:
        return [last, first].filter(Boolean).join(' ').trim();
    }
  }

  private async ensureWorkerDriveFolder(workerId: string, firstName: string, lastName: string): Promise<string> {
    const workerRef = doc(this.firestore, 'workers', workerId);
    const debugCol = collection(this.firestore, 'workers', workerId, 'driveDebug');

    const writeDebug = async (step: string, payload: Record<string, any> = {}) => {
      try {
        await addDoc(debugCol, {
          step,
          payload,
          createdAt: serverTimestamp(),
        });
      } catch (debugError) {
        console.error('[HR][DriveDebug] Could not write debug entry', step, debugError);
      }
    };

    const safeClone = (value: any): any => {
      if (value == null) return null;
      try {
        return JSON.parse(JSON.stringify(value));
      } catch {
        return String(value);
      }
    };

    const normalizeError = (error: any) => {
      const details =
        error?.details ??
        error?.customData?.details ??
        error?.error?.details ??
        error?.errorInfo?.details ??
        null;

      const rawMessage =
        details?.rawMessage ??
        error?.customData?.rawMessage ??
        error?.error?.rawMessage ??
        null;

      return {
        code: error?.code || error?.error?.code || null,
        message: error?.message || error?.error?.message || null,
        details: safeClone(details),
        rawMessage,
        name: error?.name || error?.error?.name || null,
        customData: safeClone(error?.customData ?? null),
        errorData: safeClone(error?.error ?? null),
        fullError: safeClone({
          code: error?.code ?? null,
          message: error?.message ?? null,
          name: error?.name ?? null,
          details: error?.details ?? null,
          customData: error?.customData ?? null,
          error: error?.error ?? null,
          errorInfo: error?.errorInfo ?? null,
          stack: error?.stack ?? null,
        }),
      };
    };

    try {
      await writeDebug('start', { workerId, firstName, lastName });

      const settings = await firstValueFrom(this.driveSettings.watch$().pipe(take(1)));
      const enabled = settings?.enabled !== false;
      const rootFolderId = (settings?.rootFolderId ?? '').toString().trim();
      const humanResourcesFolderName = (settings?.humanResourcesFolderName ?? '07-HUMAN RESOURCES').toString().trim() || '07-HUMAN RESOURCES';
      const workersFolderName = (settings?.workersFolderName ?? 'WORKERS').toString().trim() || 'WORKERS';
      const workerFolderNamingMode = (settings?.workerFolderNamingMode ?? 'last_first') as 'last_first' | 'first_last' | 'last_only' | 'first_only';
      const workerSubfolderTemplate = (Array.isArray(settings?.workerSubfolderTemplate) ? settings.workerSubfolderTemplate : ['01-FOTO', '02-DOCUMENTOS'])
        .map((name: any) => String(name ?? '').trim())
        .filter((name: string) => !!name);

      await writeDebug('settings_loaded', {
        enabled,
        rootFolderId: rootFolderId || null,
        humanResourcesFolderName,
        workersFolderName,
        workerFolderNamingMode,
        workerSubfolderTemplate,
      });

      if (!enabled) {
        await updateDoc(workerRef, {
          drive: {
            enabled: false,
            status: 'disabled',
            updatedAt: serverTimestamp(),
          },
        });
        await writeDebug('drive_disabled');
        return 'Drive integration is disabled.';
      }

      const payload: any = {
        firstName,
        lastName,
        workerId,
        humanResourcesFolderName,
        workersFolderName,
        workerFolderNamingMode,
        workerSubfolderTemplate,
      };
      if (rootFolderId) {
        payload.rootFolderId = rootFolderId;
      }

      await writeDebug('calling_function', payload);
      const res = await this.driveFns.createWorkerFolder(payload);
      await writeDebug('function_response', { success: res?.success === true, response: res ?? null });

      if (res?.success && res.workerFolderId) {
        await updateDoc(workerRef, {
          drive: {
            enabled: true,
            status: 'ready',
            rootFolderId: rootFolderId || null,
            humanResourcesFolderId: res.humanResourcesFolderId ?? null,
            workersFolderId: res.workersFolderId ?? null,
            workerFolderId: res.workerFolderId,
            workerFolderName: res.workerFolderName ?? this.buildWorkerFolderName(firstName, lastName, workerFolderNamingMode),
            workerFolderUrl: res.workerFolderUrl ?? null,
            workerFolderPath: res.workerFolderPath ?? `${humanResourcesFolderName}/${workersFolderName}/${this.buildWorkerFolderName(firstName, lastName, workerFolderNamingMode)}`.trim(),
            updatedAt: serverTimestamp(),
          },
        });
        await writeDebug('function_success', {
          workerFolderId: res.workerFolderId,
          workerFolderName: res.workerFolderName ?? null,
          workerFolderUrl: res.workerFolderUrl ?? null,
        });
        return 'Drive folder created.';
      }

      const errorMessage = res?.message || 'Could not create worker Drive folder.';
      await updateDoc(workerRef, {
        drive: {
          enabled: true,
          status: 'error',
          rootFolderId: rootFolderId || null,
          errorMessage,
          updatedAt: serverTimestamp(),
        },
      });
      await writeDebug('function_returned_error', {
        rootFolderId: rootFolderId || null,
        response: res ?? null,
        errorMessage,
      });
      return 'Worker saved, but Drive folder could not be created.';
    } catch (error: any) {
      const normalizedError = normalizeError(error);
      console.error('[HR] createWorkerFolder failed', normalizedError, error);
      await updateDoc(workerRef, {
        drive: {
          enabled: true,
          status: 'error',
          errorCode: normalizedError.code,
          errorMessage:
            normalizedError.rawMessage ||
            normalizedError.details?.rawMessage ||
            normalizedError.details?.message ||
            normalizedError.message ||
            'Could not create worker Drive folder.',
          errorDetails: normalizedError.details || normalizedError.customData || normalizedError.errorData || null,
          updatedAt: serverTimestamp(),
        },
      });
      await writeDebug('function_threw_error', normalizedError);
      return 'Worker saved, but Drive folder could not be created.';
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  /*private async uploadWorkerDocuments(workerId: string, firstName: string, lastName: string, docs: WorkerDocumentView[]) {
    const hasFiles = docs.some((docItem) => Array.isArray(docItem.files) && docItem.files.length > 0);
    if (!hasFiles) return;

    const workerRef = doc(this.firestore, 'workers', workerId);
    let workerSnap = await getDoc(workerRef);
    let driveFolderId = String(workerSnap.data()?.['drive']?.['workerFolderId'] ?? '').trim() || null;

    if (!driveFolderId) {
      await this.ensureWorkerDriveFolder(workerId, firstName, lastName);
      workerSnap = await getDoc(workerRef);
      driveFolderId = String(workerSnap.data()?.['drive']?.['workerFolderId'] ?? '').trim() || null;
    }

    const workerDocPath = collection(this.firestore, 'workers', workerId, 'documents');

    if (!driveFolderId) {
      throw new Error('Worker Drive folder is missing. Create the Drive folder before uploading documents.');
    }

    for (const docItem of docs) {
      for (const file of docItem.files ?? []) {
        const base64 = await this.fileToBase64(file);
        const base64Payload = base64.includes(',') ? base64.split(',')[1] : base64;

        const res = await this.driveFns.uploadWorkerDocumentToDrive({
          workerFolderId: driveFolderId,
          workerId,
          documentType: docItem.type,
          documentLabel: docItem.label,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileBase64: base64Payload,
        });

        if (!res?.success || !res.fileId) {
          throw new Error(res?.message || `Could not upload ${file.name} to Google Drive.`);
        }

        await addDoc(workerDocPath, {
          type: docItem.type,
          label: docItem.label,
          fileName: res.fileName || file.name,
          driveFileId: res.fileId,
          driveWebViewLink: res.webViewLink ?? null,
          driveWebContentLink: res.webContentLink ?? null,
          mimeType: res.mimeType || file.type || null,
          uploadedAt: serverTimestamp(),
        });
      }
    }

    await updateDoc(workerRef, {
      'drive.updatedAt': serverTimestamp(),
    });
  }*/

  private cloneEmergencyContact(value: EmergencyContactView): EmergencyContactView {
    return {
      name: String(value?.name ?? '').trim(),
      relationship: String(value?.relationship ?? '').trim(),
      phone: String(value?.phone ?? '').trim(),
    };
  }

  private toNumberOrNull(value: any): number | null {
    const normalized = value === '' || value === undefined || value === null ? NaN : Number(value);
    return Number.isFinite(normalized) ? normalized : null;
  }
}
