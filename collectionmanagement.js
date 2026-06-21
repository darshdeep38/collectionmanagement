import { LightningElement, track, api, wire } from 'lwc';
import saveMilestoneFields from '@salesforce/apex/CollectionController.saveMilestoneFields';
import getPaymentMilestones from '@salesforce/apex/CollectionController.getPaymentMilestones';
import saveCollectionManagement from '@salesforce/apex/CollectionController.saveCollectionManagement';
import getBookings from '@salesforce/apex/CollectionController.getBookings';
import startWelcomeCall from '@salesforce/apex/WelcomeCallController.startWelcomeCall';
import getDocument from '@salesforce/apex/CustomerSOAAPIHandler.handleCustomerSOARequest';
import getRelatedDemands from '@salesforce/apex/CollectionController.getRelatedDemands';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { openTab, getAllTabInfo, focusTab, setTabLabel } from 'lightning/platformWorkspaceApi';
import { NavigationMixin } from 'lightning/navigation';
import { CurrentPageReference } from 'lightning/navigation';
import createTPRCase from '@salesforce/apex/CollectionController.createTPRCase';
import getLastCallDispositionHistory from '@salesforce/apex/CollectionController.getLastCallDispositionHistory';
import getCollectibleHistory from '@salesforce/apex/CollectionController.getCollectibleHistory';
import getSubCategoryHistory from '@salesforce/apex/CollectionController.getSubCategoryHistory';
import sendSOAEmail from '@salesforce/apex/CollectionController.sendSOAEmail';
import getPartialPaymentHistory from '@salesforce/apex/CollectionController.getPartialPaymentHistory';
import sendDemandEmail from '@salesforce/apex/CollectionController.sendDemandEmail';

const COLLECTIBLE_OPTIONS = [
    { label: '-None-', value: '' },
    { label: 'Collectible', value: 'Collectible' },
    { label: 'Non-Collectible', value: 'Non-Collectible' }
];

const COLLECTIBLE_SUB_OPTIONS = [
    { label: 'Promise to Pay', value: 'Promise to Pay' },
    { label: 'Sanction Awaited', value: 'Sanction Awaited' },
    { label: 'Payment not Confirmed', value: 'Payment not Confirmed' },
    { label: 'Arranging Fund', value: 'Arranging Fund' },
    { label: 'Will pay Next Month', value: 'Will pay Next Month' },
    { label: 'Want to Sell', value: 'Want to Sell' },
    { label: 'Fund Issue', value: 'Fund Issue' },
    { label: 'Payment on Registry', value: 'Payment on Registry' },
    { label: 'Will Pay Partial (Chargeable / Addition / Removal)', value: 'Will Pay Partial (Chargeable / Addition / Removal)' },
    { label: 'No Fund', value: 'No Fund' },
    { label: 'Loan Case APF Pending', value: 'Loan Case APF Pending' },
    { label: 'Tehsil Issue', value: 'Tehsil Issue' },
    { label: 'Area Dispute', value: 'Area Dispute' },
    { label: 'No Response', value: 'No Response' }
];

const NON_COLLECTIBLE_SUB_OPTIONS = [
    { label: 'Terminated Case', value: 'Terminated Case' },
    { label: 'Holding & Interest', value: 'Holding & Interest' },
    { label: 'Hold by Management', value: 'Hold by Management' },
    { label: 'Want Cancel', value: 'Want Cancel' },
    { label: 'Fund Merger', value: 'Fund Merger' },
    { label: 'Legal Case', value: 'Legal Case' },
    { label: 'Refund In Process', value: 'Refund In Process' },
    { label: 'Booking Amount Short', value: 'Booking Amount Short' },
    { label: 'Dispute on TSV & Discount (Changeable / Addition / Removal)', value: 'Dispute on TSV & Discount (Changeable / Addition / Removal)' },
    { label: 'Under Cancellation', value: 'Under Cancellation' }
];

const ACTIVITY_OPTIONS = [
    { label: 'Registry', value: 'Registry' },
    { label: 'BBA', value: 'BBA' },
    { label: 'Handover', value: 'Handover' },
    { label: 'NOC', value: 'NOC' },
    { label: 'TPA', value: 'TPA' },
    { label: 'PTM', value: 'PTM' },
    { label: 'PID', value: 'PID' }
];

const ACTION_OPTIONS = [
    { label: 'Call', value: 'Call' },
    { label: 'Fetch SOA', value: 'Send Demand' }
   // { label: 'Send Demand (WA/Email)', value: 'Send Demand' },
   // { label: 'Send WA reminder', value: 'Send WA reminder' }
];

// START: New Demand Action dropdown
const DEMAND_ACTION_OPTIONS = [
  //  { label: 'Send Demand (WA/Email)', value: 'Send Demand' },
   // { label: 'Send Demand', value: 'Send Demand1' },
     { label: 'Send Email', value: 'Send Email' },
     { label: 'Send WA reminder', value: 'Send WA reminder' }
];
// END

const BILLED_OPTIONS = [
    { label: '-None-', value: '' },
    { label: 'True', value: 'True' },
    { label: 'False', value: 'False' }
];

const YES_NO_OPTIONS = [
    { label: '-None-', value: '' },
    { label: 'Yes', value: 'Yes' },
    { label: 'No', value: 'No' }
];

const LAST_CALL_DISPOSITION_OPTIONS = [
    { label: 'Call Back Requested', value: 'Call Back Requested' },
    { label: 'Connected - Discussed', value: 'Connected - Discussed' },
    { label: 'Connected - Not Interested', value: 'Connected - Not Interested' },
    { label: 'Connected - Will Pay', value: 'Connected - Will Pay' },
    { label: 'Disconnected', value: 'Disconnected' },
    { label: 'Left Voicemail', value: 'Left Voicemail' },
    { label: 'No Answer', value: 'No Answer' },
    { label: 'Not Reachable', value: 'Not Reachable' },
    { label: 'Number Busy', value: 'Number Busy' },
    { label: 'Number Does Not Exist', value: 'Number Does Not Exist' },
    { label: 'Wrong Number', value: 'Wrong Number' },
    { label: 'Promise to Pay', value: 'Promise to Pay' },
    { label: 'Dispute', value: 'Dispute' },
    { label: 'Escalated', value: 'Escalated' }
];

const DISCOUNT_PERCENT = 0.09;

const CASE_STATUSES_DISABLE_LOG = ['Approved', 'In Progress'];

function isPastFifthWorkingDay() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    let workingDayCount = 0;
    for (let day = 1; day <= today.getDate(); day++) {
        const d = new Date(year, month, day);
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) workingDayCount++;
        if (workingDayCount === 5 && day < today.getDate()) return true;
    }
    return false;
}

export default class NestedCases extends NavigationMixin(LightningElement) {

    @track allData = [];
    @track visibleRows = [];
    @track totalitems = 0;
    @track sortedBy = 'Last Viewed Date';
    @track isSaving = false;
    @track showDateModal = false;
    @track modalDateValue = null;
    @track modalBookingId = null;
    @track showProjectedDateModal = false;
    projectedDemandId;
    projectedDateValue;

    collectibleOptions = COLLECTIBLE_OPTIONS;
    collectibleSubOptions = COLLECTIBLE_SUB_OPTIONS;
    nonCollectibleSubOptions = NON_COLLECTIBLE_SUB_OPTIONS;
    activityOptions = ACTIVITY_OPTIONS;
    actionOptions = ACTION_OPTIONS;
    // START: Demand Action dropdown options
   // demandActionOptions = DEMAND_ACTION_OPTIONS;
    billedOptions = BILLED_OPTIONS;
    yesNoOptions = YES_NO_OPTIONS;
    lastCallDispositionOptions = LAST_CALL_DISPOSITION_OPTIONS;

    ptpFrozen = isPastFifthWorkingDay();

    bookingnamearrow = '↑';
    projectnamearrow = '↑';
    customernameArrow = '↑';
    invoiceamountArrow = '↑';
    bbadunningstatusArrow = '↑';
    bbadunIngdateArrow = '↑';
    duedaysArrow = '↑';
    ptpdateArrow = '↑';
    ptpamountArrow = '↑';
    collectibleArrow = '↑';
    lastcalldispositionArrow = '↑';
    cxratingArrow = '↑';
    billingpercentArrow = '↑';
    dunninglevelArrow = '↑';
    dunningdateArrow = '↑';

    bookingnamedirection = 'asc';
    projectnamedirection = 'asc';
    customernamedirection = 'asc';

    selectedlistView = 'RECENTLY_VIEWED';
    pinnedListView = null;
    searchKey = '';
    originalData = [];

    listviewOptions = [
        { label: 'All Bookings', value: 'ALL' },
        { label: 'All Open Bookings', value: 'ALL_OPEN' },
        { label: 'All Closed Bookings', value: 'ALL_CLOSED' },
        { label: "Today's Bookings", value: 'TODAYS' },
        { label: "My Team's Bookings", value: 'MYTEAMS' },
        { label: 'Recently Viewed', value: 'RECENTLY_VIEWED' },

        { label: 'Overdue Bookings', value: 'OVERDUE' },
        { label: 'Due Till End Of Month', value: 'DUE_THIS_MONTH' },
        { label: 'Not Due Bookings', value: 'NOT_DUE' }
    ];

    filterLogicSelected = 'AND';
    customLogic = false;
    customLogicValue = 1;
    customLogicError = '';
    filterCount = 1;

    @track showFilters = false;

    @track filters = [{
        id: 1,
        field: 'BookingName',
        operator: '==',
        value: '',
        dateValue: '',
        showInput: true,
        showCombobox: false,
        showDate: false,
        valueOptions: []
    }];

    @track filterLogicOptions = [
        { label: 'All Conditions Are Met (AND)', value: 'AND' },
        { label: 'Any Condition Is Met (OR)', value: 'OR' },
        { label: 'Custom Condition Logic Is Met', value: 'CUSTOM' }
    ];

    @track dispositionHistory = [];
    @track showDispositionHistory = false;

    @track operatorOptions = [
        { label: 'Equal', value: '==' },
        { label: 'Not Equal', value: '!=' },
        { label: 'Greater Than', value: '>' },
        { label: 'Less Than', value: '<' },
        { label: 'Greater Than or Equal To', value: '>=' },
        { label: 'Less Than or Equal To', value: '<=' },
        { label: 'Contains', value: 'Contains' },
        { label: 'Does not contain', value: 'Does not contain' },
        { label: 'Starts With', value: 'Starts With' }
    ];

    @track fieldOptions = [
        { label: 'Booking Name', value: 'BookingName' },
        { label: 'Project', value: 'ProjectName' },
        { label: 'Customer Name', value: 'ApplicantName' }
    ];

    @api recordId;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.recordId = currentPageReference.attributes.recordId;
        }
    }

    get selectedListViewLabel() {
        const selected = this.listviewOptions.find(item => item.value === this.selectedlistView);
        return selected ? selected.label : 'Recently Viewed';
    }

    get pinnedIcon() {
        return this.selectedlistView === this.pinnedListView ? 'utility:pinned' : 'utility:pin';
    }

    get hasRecords() {
        return this.visibleRows && this.visibleRows.length > 0;
    }

    connectedCallback() {
        const storedPin = localStorage.getItem('pinnedListView');
        if (storedPin) {
            this.pinnedListView = storedPin;
            this.selectedlistView = storedPin;
        }
        this.loadData();
        this.handleOpen();
    }

    loadData() {
        getBookings({
            viewName: this.selectedlistView,
            searchTerm: this.searchKey,
            timeStamp: Date.now()
        })
            .then(data => {
                this.originalData = data;
                this.allData = [...data];
                this.buildRows();
            })
            .catch(error => {
                console.error('loadData error:', JSON.stringify(error));
            });
    }

    openDateModal(event) {
        this.modalBookingId = event.currentTarget.dataset.id;
        this.modalDateValue = event.currentTarget.dataset.value || null;
        this.showDateModal = true;
    }

    closeDateModal() {
        this.showDateModal = false;
        this.modalBookingId = null;
        this.modalDateValue = null;
    }

    handleModalDateChange(event) {
        this.modalDateValue = event.detail.value;
    }

    confirmDateModal() {
        if (!this.modalBookingId) {
            return;
        }
        this.handleBookingFieldChange({
            currentTarget: {
                dataset: {
                    id: this.modalBookingId,
                    field: 'PTP_Date__c'
                }
            },
            detail: {
                value: this.modalDateValue
            }
        });
        this.closeDateModal();
    }

    openProjectedDateModal(event) {
        this.projectedDemandId = event.currentTarget.dataset.id;
        this.projectedDateValue = event.currentTarget.dataset.value || null;
        this.showProjectedDateModal = true;
    }

    closeProjectedDateModal() {
        this.showProjectedDateModal = false;
        this.projectedDemandId = null;
        this.projectedDateValue = null;
    }

    handleProjectedModalDateChange(event) {
        this.projectedDateValue = event.detail.value;
    }

    confirmProjectedDateModal() {
        if (!this.projectedDemandId) {
            return;
        }
        this.handleDemandFieldChange({
            currentTarget: {
                dataset: {
                    id: this.projectedDemandId,
                    field: 'ProjectedPaymentDate'
                }
            },
            detail: {
                value: this.projectedDateValue
            }
        });
        this.closeProjectedDateModal();
    }

    handleDispositionMouseOver(event) {
        const bookingId = event.currentTarget.dataset.id;
        getLastCallDispositionHistory({ bookingId })
            .then(result => {
                result = result.map(item => ({
                    ...item,
                    formattedDate: new Intl.DateTimeFormat('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    }).format(new Date(item.changedDate))
                }));
                this.visibleRows = this.visibleRows.map(row => ({
                    ...row,
                    showDispositionHistory: row.Id === bookingId,
                    dispositionHistory: row.Id === bookingId ? result : []
                }));
            })
            .catch(error => {
                console.error(error);
            });
    }

    handleDispositionMouseOut(event) {
        const bookingId = event.currentTarget.dataset.id;
        this.visibleRows = this.visibleRows.map(row => {
            if (row.Id === bookingId) {
                return { ...row, showDispositionHistory: false };
            }
            return row;
        });
    }

    handleCollectibleMouseOver(event) {
        const bookingId = event.currentTarget.dataset.id;
        getCollectibleHistory({ bookingId })
            .then(result => {
                const formatted = result.map(item => ({
                    ...item,
                    formattedDate: new Intl.DateTimeFormat('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    }).format(new Date(item.changedDate))
                }));
                this.visibleRows = this.visibleRows.map(row => ({
                    ...row,
                    showCollectibleHistory: row.Id === bookingId,
                    collectibleHistory: row.Id === bookingId ? formatted : (row.collectibleHistory || [])
                }));
            })
            .catch(error => {
                console.error('Failed to fetch collectible history:', error);
            });
    }

    handleCollectibleMouseOut(event) {
        const bookingId = event.currentTarget.dataset.id;
        this.visibleRows = this.visibleRows.map(row => {
            if (row.Id === bookingId) {
                return { ...row, showCollectibleHistory: false };
            }
            return row;
        });
    }

    handleSubCategoryMouseOver(event) {
        const bookingId = event.currentTarget.dataset.id;
        getSubCategoryHistory({ bookingId })
            .then(result => {
                const formatted = result.map(item => ({
                    ...item,
                    formattedDate: new Intl.DateTimeFormat('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    }).format(new Date(item.changedDate))
                }));
                this.visibleRows = this.visibleRows.map(row => ({
                    ...row,
                    showSubCategoryHistory: row.Id === bookingId,
                    subCategoryHistory: row.Id === bookingId ? formatted : (row.subCategoryHistory || [])
                }));
            })
            .catch(error => {
                console.error('Failed to fetch sub-category history:', error);
            });
    }

    handleSubCategoryMouseOut(event) {
        const bookingId = event.currentTarget.dataset.id;
        this.visibleRows = this.visibleRows.map(row => {
            if (row.Id === bookingId) {
                return { ...row, showSubCategoryHistory: false };
            }
            return row;
        });
    }

// mouse event for partial payment amount
handlePartialPaymentMouseOver(event) {

    const demandId = event.currentTarget.dataset.id;

    getPartialPaymentHistory({ demandId })
        .then(result => {

            const history = result.map(item => ({
                ...item,
                formattedDate: new Date(item.changedDate).toLocaleString()
            }));

            this.visibleRows = this.visibleRows.map(row => ({
                ...row,
                demandRows: row.demandRows
                    ? row.demandRows.map(d =>
                        d.DemandId === demandId
                            ? {
                                ...d,
                                showPartialPaymentHistory: true,
                                partialPaymentHistory: history
                            }
                            : d
                    )
                    : []
            }));
        });
}

handlePartialPaymentMouseOut(event) {

    const demandId = event.currentTarget.dataset.id;

    this.visibleRows = this.visibleRows.map(row => ({
        ...row,
        demandRows: row.demandRows
            ? row.demandRows.map(d =>
                d.DemandId === demandId
                    ? {
                        ...d,
                        showPartialPaymentHistory: false
                    }
                    : d
            )
            : []
    }));
}




    // ── Interest amount formatter ────────────────────────────────
formatRs(value) {
    if (value === null || value === undefined || value === '') return 'Rs. 0';
    const num = parseFloat(value);
    if (isNaN(num)) return 'Rs. 0';
    return 'Rs. ' + num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

get formattedInterest() {
    const r = this._currentExpandedRow;   // replace with however you access the expanded row
    if (!r) return {};
    return {
        BalanceInterest  : this.formatRs(r.BalanceInterest),
        InterestAccrued  : this.formatRs(r.InterestAccrued),
        InterestCollected: this.formatRs(r.InterestCollected),
        InterestWaived   : this.formatRs(r.InterestWaived),
        InterestSlabs    : this.formatRs(r.InterestSlabs)
    };
}

// ── Interest card column resize ──────────────────────────────
_interestResizeState = null;

handleInterestResizeMouseDown(event) {
    event.preventDefault();
    const handle = event.currentTarget;
    const card   = handle.closest('.interest-card');
    if (!card) return;

    handle.classList.add('interest-resize-handle--active');

    this._interestResizeState = {
        card,
        handle,
        startX:     event.clientX,
        startWidth: card.getBoundingClientRect().width
    };

    this._interestMouseMoveRef = this.handleInterestResizeMouseMove.bind(this);
    this._interestMouseUpRef   = this.handleInterestResizeMouseUp.bind(this);

    window.addEventListener('mousemove', this._interestMouseMoveRef);
    window.addEventListener('mouseup',   this._interestMouseUpRef);
}

handleInterestResizeMouseMove(event) {
    if (!this._interestResizeState) return;
    const { card, startX, startWidth } = this._interestResizeState;
    const delta    = event.clientX - startX;
    const newWidth = Math.max(120, startWidth + delta);  // min 120px
    card.style.width    = newWidth + 'px';
    card.style.flexBasis = newWidth + 'px';
}

handleInterestResizeMouseUp() {
    if (!this._interestResizeState) return;
    this._interestResizeState.handle
        .classList.remove('interest-resize-handle--active');
    this._interestResizeState = null;
    window.removeEventListener('mousemove', this._interestMouseMoveRef);
    window.removeEventListener('mouseup',   this._interestMouseUpRef);
}

    buildRows() {
        this.ptpFrozen = isPastFifthWorkingDay();
        const today = new Date();
        this.visibleRows = this.allData.map(row => ({
            ...row,
            bookingIcon: 'utility:chevronright',
            demandsExpanded: false,
            demandRows: [],
            hasDemandRows: false,
            hasUnits: row.hasUnits === true,
            hasDemands: row.hasDemands === true,
            DunningLevel: row.DunningLevel || '',
            BBADuningStatus: row.DunningLevel || null,
            BBADuningDate: row.BBADuningDate || null,
            CXSatisfactionRating: row.CXSatisfactionRating != null ? row.CXSatisfactionRating : '',
            BillingReceivedPercentAgainstTSV: row.BillingReceivedPercentAgainstTSV != null ? row.BillingReceivedPercentAgainstTSV : '',
            InvoiceAmountPendingTotal: row.InvoiceAmountPendingTotal != null ? row.InvoiceAmountPendingTotal : '',
            DueDays: row.DueDays != null ? row.DueDays : '',
            PTP_Date: row.PTPDate || null,
            PTP_Amount: row.PTPAmount != null ? row.PTPAmount : null,
            MilestoneDemandPercent: row.MilestoneDemandPercent != null ? row.MilestoneDemandPercent : null,
            LastCallDisposition: row.LongCallDisposition || '',
            Remarks: row.Remarks || '',
            CollectibleNonCollectible: row.CollectibleNonCollectible || '',
            SubCategory: row.SubCategory || '',
            disableCollectible:
    row.PTPDate &&
    new Date(row.PTPDate).getFullYear() === today.getFullYear() &&
    new Date(row.PTPDate).getMonth() === today.getMonth(),

disableSubCategory:
    row.PTPDate &&
    new Date(row.PTPDate).getFullYear() === today.getFullYear() &&
    new Date(row.PTPDate).getMonth() === today.getMonth(),
            showDispositionHistory: false,
            dispositionHistory: [],
            showCollectibleHistory: false,
            collectibleHistory: [],
            showSubCategoryHistory: false,
            subCategoryHistory: [],
            isCollectible: row.CollectibleNonCollectible === 'Collectible',
            isNonCollectible: row.CollectibleNonCollectible === 'Non-Collectible',
            subCategoryError: false,
            
            ActivityRequiredForCollection: row.ActivityRequiredForCollection || '',
            ptpEditable: !this.ptpFrozen || !row.PTPDate,
            SelectedAction: row.SelectedAction || '',
            cxStars: this.buildStars(row.CXSatisfactionRating),
            FormattedBalanceInterest  : this.formatRs(row.BalanceInterest),
    FormattedInterestAccrued  : this.formatRs(row.InterestAccrued),
    FormattedInterestCollected: this.formatRs(row.InterestCollected),
    FormattedInterestWaived   : this.formatRs(row.InterestWaived),
   FormattedInterestSlabs    : row.InterestSlabs || 0,
        }));
        this.totalitems = this.visibleRows.length;
    }

    buildStars(ratingValue) {
        const rating = parseInt(ratingValue, 10) || 0;
        return [1, 2, 3, 4, 5].map(num => ({
            value: num,
            classMap: num <= rating ? 'star filled' : 'star'
        }));
    }

    toggleBookingDemands(event) {
        const bookingId = event.currentTarget.dataset.id;
        const rowIndex = this.visibleRows.findIndex(r => r.Id === bookingId);
        if (rowIndex === -1) return;

        let rows = [...this.visibleRows];
        let row = { ...rows[rowIndex] };

        if (row.demandsExpanded) {
            row.demandsExpanded = false;
            row.bookingIcon = 'utility:chevronright';
            row.demandRows = [];
            row.hasDemandRows = false;
            rows[rowIndex] = row;
            this.visibleRows = rows;
            return;
        }

        if (row.demandRows && row.demandRows.length > 0) {
            row.demandsExpanded = true;
            row.bookingIcon = 'utility:chevrondown';
            rows[rowIndex] = row;
            this.visibleRows = rows;
            return;
        }

        getPaymentMilestones({ bookingId })
            .then(milestones => {
                const sortedMilestones = [...milestones].sort((a, b) => {
                    const nameA = (a.MilestoneName || '').toLowerCase();
                    const nameB = (b.MilestoneName || '').toLowerCase();
                    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
                });
                row.demandRows = sortedMilestones.map(m => this.buildMilestoneRow(m));
                row.hasDemandRows = row.demandRows.length > 0;
                row.demandsExpanded = true;
                row.bookingIcon = 'utility:chevrondown';
                rows[rowIndex] = row;
                this.visibleRows = rows;
            })
            .catch(error => {
                console.error('getRelatedDemands error:', JSON.stringify(error));
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error loading demands',
                    message: error?.body?.message || 'Unknown error',
                    variant: 'error'
                }));
            });
    }

    buildMilestoneRow(d) {
        console.log('Milestone Row Data', JSON.stringify(d));   // to test
        const caseStatus = d.CaseStatus || '';
        const logCaseDisabled = !!d.CaseNumber || CASE_STATUSES_DISABLE_LOG.includes(caseStatus);
        const logCaseDisabledReason = d.CaseNumber
            ? 'TPR Case is already created'
            : (logCaseDisabled ? `Case is ${caseStatus}` : '');

       let earlierDays = '';
if (d.BillingDueDate && d.ProjectedDateOfPayment) {
    const due = new Date(d.BillingDueDate);
    const projected = new Date(d.ProjectedDateOfPayment);
    earlierDays = Math.floor(
        (due.getTime() - projected.getTime()) /
        (1000 * 60 * 60 * 24)
    );
}

const totalBilled = Number(d.TotalBilledLessTDS) || 0;
const discount = Number(d.DiscountAmount) || 0;

const netReceivedAmount = Number(
    (totalBilled - discount).toFixed(2)
);

console.log(
        'Milestone Id = ' + d.Id +
        ' | Demand Id = ' + d.DemandId
    );



        return {
            Id: d.Id,
            DemandId: d.DemandId || d.Id,
            MilestoneId: d.Id,
            DemandDisplayName: d.DemandName || '',
            DemandName: d.DemandName || '',
            DemandSAPCode: d.DemandSAPCode || '',
            ChargeCode: d.ChargeCode || '',
            BillingDueDate: d.BillingDueDate || null,
            BillingAmtBasic: d.BillingAmtBasic != null ? d.BillingAmtBasic : '',
           // TDS1Percent: d.TDSTax != null ? d.TDSTax : '',
           TDS1Percent: d.TdsAmount != null ? d.TdsAmount : '',
            TotalBilledLessTDS: d.TotalBilledLessTDS != null ? d.TotalBilledLessTDS : '',
            MilestoneName: d.MilestoneName || '',
            BilledUnbilled: d.BilledUnbilled || '',
            TDSApplicable: d.TdsApplicable || '',
            ProjectedPaymentDate: d.ProjectedDateOfPayment || null,
            DiscountApplied: d.DiscountApplied || '',
            EarlierDays: earlierDays,
            DiscountCalculatedValue: d.DiscountAmount != null ? d.DiscountAmount : '',
            logCaseDisabled: logCaseDisabled,
            logCaseDisabledReason: logCaseDisabledReason,
            //CaseStatus: caseStatus,
          //  PartialPaymentAmount: d.PartialPaymentAmount != null ? d.PartialPaymentAmount : null,
           // CaseNumber: d.CaseNumber || '',
           // CaseId: d.CaseId || null,
           CaseStatus: caseStatus,
            PartialPaymentAmount: d.PartialPaymentAmount != null ? d.PartialPaymentAmount : null,
            showPartialPaymentHistory: false,
            partialPaymentHistory: [],
            CaseNumber: d.CaseNumber || '',
            CaseId: d.CaseId || null,
            FinalCaseApprovalAmount: d.ApprovedAmount || null,
            NetReceivedAmount: netReceivedAmount
        };
    }

    recomputeDemandRow(demand) {
        if (demand.BillingDueDate && demand.ProjectedPaymentDate) {
            const dueDate = new Date(demand.BillingDueDate);
            const projectedDate = new Date(demand.ProjectedPaymentDate);
            const diffTime = dueDate.getTime() - projectedDate.getTime();
            demand.EarlierDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        } else {
            demand.EarlierDays = '';
        }

        const billingAmt = Number(demand.BillingAmtBasic) || 0;
        if (demand.TDSApplicable === 'Yes') {
            demand.TDS1Percent = Number((billingAmt * 0.01).toFixed(2));
            demand.TotalBilledLessTDS = Number((billingAmt - demand.TDS1Percent).toFixed(2));
        } else {
            demand.TDS1Percent = 0;
            demand.TotalBilledLessTDS = billingAmt;
        }

        if (demand.DiscountApplied === 'Yes') {
            demand.DiscountCalculatedValue =
                demand.TotalBilledLessTDS != null
                    ? (Number(demand.TotalBilledLessTDS) * DISCOUNT_PERCENT).toFixed(2)
                    : '';
        } else {
            demand.DiscountCalculatedValue = '';
        }
        const totalBilled = Number(demand.TotalBilledLessTDS) || 0;
        const discount = Number(demand.DiscountCalculatedValue) || 0;

        demand.NetReceivedAmount = Number(
        (totalBilled - discount).toFixed(2)
        );

        return demand;
    }

    handleDemandFieldChange(event) {
        const demandId = event.currentTarget.dataset.id;
        const field = event.currentTarget.dataset.field;
        const value = event.detail.value;

        this.visibleRows = this.visibleRows.map(bookingRow => {
            if (!bookingRow.demandRows || bookingRow.demandRows.length === 0) return bookingRow;
            if (!bookingRow.demandRows.some(d => d.Id === demandId)) return bookingRow;
            const updatedDemands = bookingRow.demandRows.map(demand => {
                if (demand.Id !== demandId) return demand;
                if (field === 'PartialPaymentAmount') {
                    return { ...demand, PartialPaymentAmount: value };
                }
                return this.recomputeDemandRow({ ...demand, [field]: value });
            });
            return { ...bookingRow, demandRows: updatedDemands };
        });
    }

    handleLogCase(event) {
        const demandId = event.currentTarget.dataset.id;

        if (!demandId) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: 'No Demand ID found. Cannot create TPR Case.',
                variant: 'error'
            }));
            return;
        }

    // let earlierDays = null;

    // this.visibleRows.forEach(row => {

    //     if (row.demandRows) {

    //         const demand = row.demandRows.find(
    //             d => d.DemandId === demandId
    //         );

    //         if (demand) {
    //             earlierDays = demand.EarlierDays;
    //         }
    //     }
    // });

    let earlierDays = null;
    let requestedAmount = 0;

for (const row of this.visibleRows) {

    if (!row.demandRows) {
        continue;
    }

    const demand = row.demandRows.find(
        d =>
            d.DemandId === demandId ||
            d.Id === demandId
    );

    if (demand) {

        earlierDays =
            demand.EarlierDays !== '' &&
            demand.EarlierDays !== null &&
            demand.EarlierDays !== undefined
                ? Number(demand.EarlierDays)
                : null;


        requestedAmount =
        Number(demand.NetReceivedAmount) || 0;

    console.log('Net Received Amount = ' + demand.NetReceivedAmount);
    console.log('Requested Amount = ' + requestedAmount);

        break;
    }
}





    createTPRCase({
        demandId: demandId,
        earlierDays: earlierDays,
        requestedAmount: requestedAmount
        
    })


        //createTPRCase({ demandId })
            .then(result => {
                const caseId = result.caseId;
                const caseNumber = result.caseNumber;

                this.visibleRows = this.visibleRows.map(row => ({
                    ...row,
                    demandRows: row.demandRows
                        ? row.demandRows.map(demand => {
                            if (demand.DemandId === demandId) {
                                return {
                                    ...demand,
                                    CaseNumber: caseNumber,
                                    CaseId: caseId,
                                    logCaseDisabled: true,
                                    logCaseDisabledReason: 'TPR Case is already created'
                                };
                            }
                            return demand;
                        })
                        : row.demandRows
                }));

                this.dispatchEvent(new ShowToastEvent({
                    title: 'Success',
                    message: `TPR Case ${caseNumber} created successfully.`,
                    variant: 'success'
                }));

                if (caseId) {
                    openTab({ recordId: caseId, focus: true })
                        .catch(() => {
                            this[NavigationMixin.Navigate]({
                                type: 'standard__recordPage',
                                attributes: { recordId: caseId, actionName: 'view' }
                            });
                        });
                }
            })
            .catch(error => {
                console.error('TPR Case Error:', JSON.stringify(error));
                const msg = error?.body?.message || error?.message || 'Unknown error occurred while creating TPR Case.';
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error',
                    message: msg,
                    variant: 'error',
                    mode: 'dismissable'
                }));
            });
    }

    openRecord(event) {
        event.preventDefault();
        const recordId = event.currentTarget.dataset.id;
        if (!recordId) return;
        openTab({ recordId, focus: true })
            .catch(() => {
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: { recordId, actionName: 'view' }
                });
            });
    }

    handleRowChange(event) {
        const field = event.currentTarget.dataset.field;
        const recordId = event.currentTarget.dataset.id;
        const value = event.detail.value;

        this.visibleRows = this.visibleRows.map(row => {
            if (row.Id !== recordId) return row;

            let updated = { ...row, [field]: value };

            if (field === 'CollectibleNonCollectible') {
                updated.isCollectible = value === 'Collectible';
                updated.isNonCollectible = value === 'Non-Collectible';
                updated.SubCategory = '';
                updated.subCategoryError = false;
            }

            if (field === 'SubCategory' && value) {
                updated.subCategoryError = false;
            }

            if (field === 'PTPDate' && this.ptpFrozen && row.PTPDate) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'PTP Date Locked',
                    message: 'PTP Date is frozen after the 5th working day of the month.',
                    variant: 'warning'
                }));
                return row;
            }

            if (field === 'PTPAmount' && this.ptpFrozen && row.PTPAmount != null) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'PTP Amount Locked',
                    message: 'PTP Amount is frozen after the 5th working day of the month.',
                    variant: 'warning'
                }));
                return row;
            }

            if (field === 'SelectedAction') {
                this.handleActionSelection(value, row);
                updated.SelectedAction = '';
            }

            return updated;
        });
    }

    handleBookingFieldChange(event) {
        const field = event.currentTarget.dataset.field;
        const recordId = event.currentTarget.dataset.id;
        const value = event.detail.value;

        this.visibleRows = this.visibleRows.map(row => {
            if (row.Id !== recordId) return row;

            const propName = field === 'PTP_Date__c' ? 'PTP_Date'
                : field === 'PTP_Amount__c' ? 'PTP_Amount'
                    : field === 'MilestoneDemandPercent' ? 'MilestoneDemandPercent'
                        : field;

            let updated = { ...row, [propName]: value };

            if (field === 'PTP_Date__c') {

    if (value) {

        const selected = new Date(value);
        const now = new Date();

        const isCurrentMonth =
            selected.getFullYear() === now.getFullYear() &&
            selected.getMonth() === now.getMonth();

        if (isCurrentMonth) {

            updated.CollectibleNonCollectible = 'Collectible';
            updated.SubCategory = 'Promise to Pay';

            updated.isCollectible = true;
            updated.isNonCollectible = false;

            updated.disableCollectible = true;
            updated.disableSubCategory = true;

            updated.subCategoryError = false;

        } else {

            updated.disableCollectible = false;
            updated.disableSubCategory = false;
        }

    } else {

        updated.disableCollectible = false;
        updated.disableSubCategory = false;
    }
}

            return updated;
        });
    }

    handleActionMenuSelect(event) {
        const action = event.detail.value;
        const recordId = event.currentTarget.dataset.id;
        const row = this.visibleRows.find(r => r.Id === recordId);
        if (!row) return;
        this.handleActionSelection(action, row);
    }


/*
    // START : Demand Action Menu
handleDemandActionMenuSelect(event) {

    const action = event.detail.value;
    const demandId = event.currentTarget.dataset.id;

    let selectedDemand;

    this.visibleRows.forEach(row => {
        if (row.demandRows) {
            const demand = row.demandRows.find(
                d => d.Id === demandId
            );

            if (demand) {
                selectedDemand = demand;
            }
        }
    });

    if (!selectedDemand) {
        return;
    }

    if (action === 'Send Demand') {

        sendSOAEmail({
            bookingId: selectedDemand.BookingId
        })
        .then(result => {

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: result,
                    variant: 'success'
                })
            );

        })
        .catch(error => {

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message:
                        error?.body?.message ||
                        error?.message,
                    variant: 'error'
                })
            );

        });
    }
}

// END : Demand Action Menu
*/


// for send email 
handleDemandActionMenuSelect(event) {

    const action = event.detail.value;
    //const demandId = event.currentTarget.dataset.id;
    const demandId = event.currentTarget.dataset.demandid;
    console.log('Demand Id Sent = ' + demandId);
    console.log('Action = ' + action);
    console.log('Demand Id = ' + demandId);


    if (action === 'Send Email') {

        sendDemandEmail({
            demandId: demandId
        })
        .then(result => {

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: result,
                    variant: 'success'
                })
            );

        })
        .catch(error => {

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message:
                        error?.body?.message ||
                        error?.message,
                    variant: 'error'
                })
            );

        });
    }
}


    handleActionSelection(action, row) {
        if (action === 'Call') {
            const bookingId = row.BookingId || row.Id;
            startWelcomeCall({ recordId: bookingId })
                .then(result => {
                    const msg = result?.message ?? result?.msg ?? 'Call initiated successfully';
                    this.dispatchEvent(new ShowToastEvent({
                        title: 'Call Initiated', message: String(msg),
                        variant: 'success', mode: 'dismissable'
                    }));
                })
                .catch(error => {
                    this.dispatchEvent(new ShowToastEvent({
                        title: 'Call Error',
                        message: error?.body?.message || error?.message || 'Unknown error occurred',
                        variant: 'error', mode: 'dismissable'
                    }));
                });

        } else if (action === 'Send Demand') {
            const bookingId = row.BookingId || row.Id;
            getDocument({ recordId: bookingId, actionName: 'Statement_of_Account'})
            //sendSOAEmail({ bookingId: bookingId})
                .then(result => {
                    // if (result.status === 'success') {
                    //     const byteCharacters = atob(result.base64Pdf);
                    //     const byteNumbers = new Array(byteCharacters.length);
                    //     for (let i = 0; i < byteCharacters.length; i++) {
                    //         byteNumbers[i] = byteCharacters.charCodeAt(i);
                    //     }
                    //     const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
                    //     const blobUrl = window.URL.createObjectURL(blob);
                    //     window.open(blobUrl, '_blank', 'noopener,noreferrer');
                    //     this.dispatchEvent(new ShowToastEvent({
                    //         title: 'Success', message: result.fileType + ' opened successfully.',
                    //         variant: 'success'
                    //     }));
                    // } 
                //       else {
                //         this.dispatchEvent(new ShowToastEvent({
                //             title: 'Error', message: result.response, variant: 'error'
                //         }));
                //     }
                // })
                if (result.status === 'success') {

    sendSOAEmail({
        bookingId: bookingId
    })
    .then(emailResult => {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: emailResult,
                variant: 'success'
            })
        );
    })
    .catch(emailError => {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Email Failed',
                message:
                    emailError?.body?.message ||
                    emailError?.message,
                variant: 'error'
            })
        );
    });

} else {

    this.dispatchEvent(
        new ShowToastEvent({
            title: 'Error',
            message: result.response,
            variant: 'error'
        })
    );

}                    
               }) .catch(error => {
                    const rawMsg = error?.body?.message || error?.message || '';
                    const msg = rawMsg.includes('401') || rawMsg.includes('Unauthorized') || rawMsg.includes('Anmeldung')
                        ? 'SAP authentication failed (401). Please contact your administrator to refresh the SAP credentials in Named Credentials.'
                        : rawMsg || 'Error while fetching document.';
                    this.dispatchEvent(new ShowToastEvent({
                        title: 'Document Fetch Failed',
                        message: msg,
                        variant: 'error',
                        mode: 'dismissable'
                    }));
                });

        } else if (action === 'Send WA reminder') {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Sending WA Reminder',
                message: `Sending WhatsApp reminder for Booking: ${row.BookingName}`,
                variant: 'info'
            }));
        }
    }

    handleListViewChange(event) {
        this.selectedlistView = event.detail.value;
        this.sortedBy = this.selectedlistView === 'RECENTLY_VIEWED'
            ? 'Last Viewed Date' : 'Booking Name';
        this.loadData();
    }

    togglePin() {
        if (this.selectedlistView === this.pinnedListView) {
            this.pinnedListView = null;
            localStorage.removeItem('pinnedListView');
            this.dispatchEvent(new ShowToastEvent({
                title: 'Unpinned', message: `${this.selectedListViewLabel} was unpinned.`,
                variant: 'success'
            }));
        } else {
            this.pinnedListView = this.selectedlistView;
            localStorage.setItem('pinnedListView', this.selectedlistView);
            this.dispatchEvent(new ShowToastEvent({
                title: 'Pinned', message: `${this.selectedListViewLabel} was pinned.`,
                variant: 'success'
            }));
        }
    }

    handleSearch(event) {
        this.searchKey = event.target.value;
        this.loadData();
    }

    handlerefresh() {
        this.loadData();
    }

    sortBookingName() {
        this.bookingnamedirection = this.bookingnamedirection === 'asc' ? 'desc' : 'asc';
        this.bookingnamearrow = this.bookingnamedirection === 'asc' ? '↑' : '↓';
        this.sortedBy = 'Booking';
        this.sortData('BookingName', this.bookingnamedirection);
    }

    sortProjectName() {
        this.projectnamedirection = this.projectnamedirection === 'asc' ? 'desc' : 'asc';
        this.projectnamearrow = this.projectnamedirection === 'asc' ? '↑' : '↓';
        this.sortedBy = 'Project';
        this.sortData('ProjectName', this.projectnamedirection);
    }

    sortCustomerName() {
        this.customernamedirection = this.customernamedirection === 'asc' ? 'desc' : 'asc';
        this.customernameArrow = this.customernamedirection === 'asc' ? '↑' : '↓';
        this.sortedBy = 'Customer Name';
        this.sortData('ApplicantName', this.customernamedirection);
    }

    sortData(field, direction) {
        let data = [...this.allData];
        data.sort((a, b) => {
            const val1 = a[field] || '';
            const val2 = b[field] || '';
            return direction === 'asc'
                ? val1.localeCompare(val2, undefined, { sensitivity: 'base' })
                : val2.localeCompare(val1, undefined, { sensitivity: 'base' });
        });
        this.allData = data;
        this.buildRows();
    }

    handlefilter() { this.showFilters = !this.showFilters; }

    handlefilterLogicChange(event) {
        this.filterLogicSelected = event.detail.value;
        this.customLogic = this.filterLogicSelected === 'CUSTOM';
        this.generateLogic();
    }

    handleFieldChange(event) {
        const id = event.target.dataset.id;
        const value = event.detail.value;
        this.filters = this.filters.map(filter => {
            if (filter.id == id) {
                filter.field = value;
                filter.showInput = true;
                filter.showCombobox = false;
                filter.showDate = false;
            }
            return filter;
        });
    }

    handleOperatorChange(event) {
        const id = event.target.dataset.id;
        const value = event.detail.value;
        this.filters = this.filters.map(filter => {
            if (filter.id == id) filter.operator = value;
            return filter;
        });
    }

    handleValueChange(event) {
        const id = event.target.dataset.id;
        const value = event.detail.value;
        this.filters = this.filters.map(filter => {
            if (filter.id == id) filter.value = value;
            return filter;
        });
    }

    handleDateChange(event) {
        const id = event.target.dataset.id;
        const value = event.detail.value;
        this.filters = this.filters.map(filter => {
            if (filter.id == id) filter.dateValue = value;
            return filter;
        });
    }

    evaluateFilter(row, filter) {
        if (!filter.field || !filter.operator) return true;
        let fieldValue = row[filter.field];
        if (fieldValue === null || fieldValue === undefined) fieldValue = '';
        if (filter.value === null || filter.value === undefined) return true;
        switch (filter.operator) {
            case '==': return String(fieldValue) === String(filter.value);
            case '!=': return fieldValue != filter.value;
            case '>': return fieldValue > filter.value;
            case '<': return fieldValue < filter.value;
            case '>=': return fieldValue >= filter.value;
            case '<=': return fieldValue <= filter.value;
            case 'Contains': return String(fieldValue).toLowerCase().includes(filter.value.toLowerCase());
            case 'Does not contain': return !String(fieldValue).toLowerCase().includes(filter.value.toLowerCase());
            case 'Starts With': return String(fieldValue).toLowerCase().startsWith(filter.value.toLowerCase());
            default: return true;
        }
    }

    applyFilters() {
        let filteredData = [...this.originalData];
        filteredData = filteredData.filter(row => {
            if (this.filterLogicSelected === 'AND') return this.filters.every(f => this.evaluateFilter(row, f));
            if (this.filterLogicSelected === 'OR') return this.filters.some(f => this.evaluateFilter(row, f));
            if (this.filterLogicSelected === 'CUSTOM') {
                let logic = this.customLogicValue;
                this.filters.forEach(filter => {
                    const result = this.evaluateFilter(row, filter);
                    const regex = new RegExp(`\\b${filter.id}\\b`, 'g');
                    logic = logic.replace(regex, result);
                });
                logic = logic.replace(/AND/g, '&&').replace(/OR/g, '||').replace(/NOT/g, '!');
                try { return eval(logic); } catch (e) { return true; }
            }
            return true;
        });
        this.allData = filteredData;
        this.buildRows();
    }

    clearFilters() {
        this.filters = [{
            id: 1, field: '', operator: '', value: '', dateValue: '',
            showInput: false, showCombobox: false, showDate: false, valueOptions: []
        }];
        this.filterCount = 1;
        this.customLogic = '';
        this.customLogicValue = '';
        this.loadData();
    }

    handleAddCondition() {
        const newId = this.filters.length + 1;
        this.filters = [...this.filters, {
            id: newId, field: '', operator: '', value: '', dateValue: '',
            showInput: false, showCombobox: false, showDate: false, valueOptions: []
        }];
        if (!this.customLogic) this.generateLogic();
    }

    handleDeleteCondition(event) {
        const filterId = parseInt(event.currentTarget.dataset.id);
        this.filters = this.filters
            .filter(f => f.id !== filterId)
            .map((f, index) => ({ ...f, id: index + 1 }));
        if (!this.customLogic) this.generateLogic();
    }

    generateLogic() {
        if (this.filters.length === 0) { this.customLogicValue = ''; return; }
        const numbers = this.filters.map(f => f.id);
        if (this.filterLogicSelected === 'AND') this.customLogicValue = numbers.join(' AND ');
        else if (this.filterLogicSelected === 'OR') this.customLogicValue = numbers.join(' OR ');
    }

    handleCustomLogicChange(event) {
        this.customLogicValue = event.target.value;
        this.validateCustomLogic();
    }

    validateCustomLogic() {
        const maxCondition = this.filters.length;
        const numbers = this.customLogicValue.match(/\d+/g);
        if (numbers) {
            for (let n of numbers) {
                if (parseInt(n) > maxCondition) {
                    this.customLogicError = `Condition ${n} does not exist`;
                    return;
                }
            }
        }
        this.customLogicError = '';
    }

    // ── SAVE ──────────────────────────────────────────────────────────────
    handleSave() {
        let hasValidationError = false;
        this.visibleRows = this.visibleRows.map(row => {
            if (row.isNonCollectible && !row.SubCategory) {
                hasValidationError = true;
                return { ...row, subCategoryError: true };
            }
            return { ...row, subCategoryError: false };
        });

        if (hasValidationError) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Validation Error',
                message: 'Please select a Sub-Category for all Non-Collectible bookings before saving.',
                variant: 'error',
                mode: 'dismissable'
            }));
            return;
        }

        // Validate Partial Payment Amount
for (const bookingRow of this.visibleRows) {

    if (!bookingRow.demandRows) continue;

    for (const demand of bookingRow.demandRows) {

        const partialAmt = Number(demand.PartialPaymentAmount) || 0;
        const netAmt = Number(demand.NetReceivedAmount) || 0;

        if (partialAmt > netAmt) {

            this.dispatchEvent(
                new ShowToastEvent({
                    title: '',
                    message: `Partial Payment Amount (${partialAmt}) cannot be greater than Net Received Amount (${netAmt}) for Demand ${demand.DemandName}.`,
                    variant: 'error'
                })
            );

            return;
        }
    }
}



        this.isSaving = true;

        const bookingUpdates = this.visibleRows
            .filter(row =>
                row.PTP_Date ||
                row.PTP_Amount != null ||
                row.Remarks ||
                row.LastCallDisposition ||
                row.CollectibleNonCollectible ||
                row.SubCategory ||
                row.ActivityRequiredForCollection ||
                row.MilestoneDemandPercent != null
            )
            .map(row => ({
                bookingId: row.Id,
                ptpDate: row.PTP_Date || null,
                ptpAmount: row.PTP_Amount != null ? row.PTP_Amount : null,
                milestoneDemandPercent: row.MilestoneDemandPercent != null ? row.MilestoneDemandPercent : null,
                remarks: row.Remarks || null,
                lastCallDisposition: row.LastCallDisposition || null,
                collectible: row.CollectibleNonCollectible || null,
                subCategory: row.SubCategory || null,
                activityRequiredForCollection: row.ActivityRequiredForCollection || null
            }));

        const milestoneUpdates = [];
        this.visibleRows.forEach(bookingRow => {
            if (!bookingRow.demandRows || bookingRow.demandRows.length === 0) return;
            bookingRow.demandRows.forEach(demand => {
                
                /*
                milestoneUpdates.push({
                    milestoneId: demand.Id,
                    billedUnbilled: demand.BilledUnbilled || null,
                    projectedDateOfPayment: demand.ProjectedPaymentDate
                        ? String(demand.ProjectedPaymentDate) : null,
                    tdsApplicable: demand.TDSApplicable || null,
                    tdsAmount: demand.TDS1Percent != null && demand.TDS1Percent !== ''
                        ? Number(demand.TDS1Percent) : null,
                    discountApplied: demand.DiscountApplied || null,
                    discountAmount: demand.DiscountCalculatedValue != null && demand.DiscountCalculatedValue !== ''
                        ? Number(demand.DiscountCalculatedValue) : null,
                    partialPaymentAmount: demand.PartialPaymentAmount != null && demand.PartialPaymentAmount !== ''
                        ? Number(demand.PartialPaymentAmount) : null
                });
                */

                milestoneUpdates.push({
                milestoneId: demand.Id,
                billedUnbilled: demand.BilledUnbilled || null,
                projectedDateOfPayment: demand.ProjectedPaymentDate
                    ? String(demand.ProjectedPaymentDate) : null,
                tdsApplicable: demand.TDSApplicable || null,
                tdsAmount: demand.TDS1Percent != null && demand.TDS1Percent !== ''
                    ? Number(demand.TDS1Percent) : null,

                amountAfterTDS: demand.TotalBilledLessTDS != null && demand.TotalBilledLessTDS !== ''
                    ? Number(demand.TotalBilledLessTDS) : null,

                discountApplied: demand.DiscountApplied || null,
                discountAmount: demand.DiscountCalculatedValue != null && demand.DiscountCalculatedValue !== ''
                    ? Number(demand.DiscountCalculatedValue) : null,
                partialPaymentAmount: demand.PartialPaymentAmount != null && demand.PartialPaymentAmount !== ''
                    ? Number(demand.PartialPaymentAmount) : null,

                 
            });


            });

        });

        const collectionPromise = bookingUpdates.length > 0
            ? saveCollectionManagement({ bookingUpdatesJson: JSON.stringify(bookingUpdates) })
            : Promise.resolve({ success: true, message: 'No collection records to update.' });

        const milestonePromise = milestoneUpdates.length > 0
            ? saveMilestoneFields({ milestoneUpdatesJson: JSON.stringify(milestoneUpdates) })
            : Promise.resolve({ success: true, message: 'No milestones to update.' });

        Promise.all([collectionPromise, milestonePromise])
            .then(([collectionResult, milestoneResult]) => {
                this.isSaving = false;
                const allOk = collectionResult.success && milestoneResult.success;
                this.dispatchEvent(new ShowToastEvent({
                    title: allOk ? 'Saved Successfully' : 'Partial Save',
                    message: `Collection: ${collectionResult.message} | Milestones: ${milestoneResult.message}`,
                    variant: allOk ? 'success' : 'warning',
                    mode: 'dismissable'
                }));
                if (allOk) {
                    // ── Clear cached demand rows so re-expand fetches fresh saved values ──
                    this.visibleRows = this.visibleRows.map(row => ({
                        ...row,
                        demandsExpanded: false,
                        bookingIcon: 'utility:chevronright',
                        demandRows: [],
                        hasDemandRows: false
                    }));
                    this.loadData();
                }
            })
            .catch(error => {
                this.isSaving = false;
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Save Failed',
                    message: error?.body?.message || error?.message || 'Unknown error occurred',
                    variant: 'error',
                    mode: 'dismissable'
                }));
            });
    }

    _resizing = false; _resizeTh = null; _resizeStartX = 0; _resizeStartW = 0;
    _boundMouseMove = null; _boundMouseUp = null;

    handleResizeMouseDown(event) {
        event.preventDefault();
        event.stopPropagation();
        this._resizeTh = event.currentTarget.closest('th');
        this._resizeStartX = event.clientX;
        this._resizeStartW = this._resizeTh.offsetWidth;
        this._resizing = true;
        event.currentTarget.classList.add('active');
        this._activeHandle = event.currentTarget;
        this._boundMouseMove = this.handleResizeMouseMove.bind(this);
        this._boundMouseUp = this.handleResizeMouseUp.bind(this);
        this.template.addEventListener('mousemove', this._boundMouseMove);
        this.template.addEventListener('mouseup', this._boundMouseUp);
        window.addEventListener('mousemove', this._boundMouseMove);
        window.addEventListener('mouseup', this._boundMouseUp);
    }

    handleResizeMouseMove(event) {
        if (!this._resizing) return;
        const diff = event.clientX - this._resizeStartX;
        const newWidth = Math.max(40, this._resizeStartW + diff);
        this._resizeTh.style.width = newWidth + 'px';
        this._resizeTh.style.minWidth = newWidth + 'px';
    }

    handleResizeMouseUp() {
        if (!this._resizing) return;
        this._resizing = false;
        if (this._activeHandle) { this._activeHandle.classList.remove('active'); this._activeHandle = null; }
        this.template.removeEventListener('mousemove', this._boundMouseMove);
        this.template.removeEventListener('mouseup', this._boundMouseUp);
        window.removeEventListener('mousemove', this._boundMouseMove);
        window.removeEventListener('mouseup', this._boundMouseUp);
    }

    handleOpenDemand(event) {
        event.preventDefault();
        const recordId = event.currentTarget.dataset.id;
        if (!recordId) return;
        openTab({ recordId, focus: true })
            .catch(() => {
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: { recordId, actionName: 'view' }
                });
            });
    }

    async handleOpen() {
        try {
            const tabInfo = await getAllTabInfo();
            let customTab = {};
            tabInfo.forEach(item => {
                if (item.url.includes('Nested_Cases')) customTab = item;
            });
            if (customTab.tabId) {
                await focusTab(customTab.tabId);
                await setTabLabel(customTab.tabId, 'Bookings');
            }
        } catch (error) {
            console.error('Workspace API Error:', error);
        }
    }
}
