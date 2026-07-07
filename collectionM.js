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
import updateLastCallDate from '@salesforce/apex/CollectionController.updateLastCallDate';

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
    { label: 'Tehsil Issue', value: 'Tehsil Issue' },
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
    { label: 'None', value: 'None' },
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
    { label: 'Billed', value: 'Billed' },
    { label: 'Unbilled', value: 'Unbilled' }
];

// Keep YES_NO_OPTIONS as-is for Discount Applied
const YES_NO_OPTIONS = [
    { label: '-None-', value: '' },
    { label: 'Yes', value: 'Yes' },
    { label: 'No', value: 'No' }
];

// New dedicated options for TDS
const TDS_OPTIONS = [
    { label: '-None-', value: '' },
    { label: 'Applicable', value: 'Applicable' },
    { label: 'Not Applicable', value: 'Not Applicable' }
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
    dirtyBookingIds = new Set();
    dirtyMilestoneIds = new Set();
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
         window.addEventListener('click', this.closeAllCustomDropdowns.bind(this));
         
    }

    closeAllCustomDropdowns() {
    this.visibleRows = this.visibleRows.map(row => ({
        ...row,
        showCollectibleDropdown: false,
        collectibleDropdownStyle: '',
        showSubCategoryDropdown: false,
        subCategoryDropdownStyle: '',
        showActivityDropdown: false,
        activityDropdownStyle: '',
        demandRows: row.demandRows
            ? row.demandRows.map(d => ({
                ...d,
                showBilledDropdown: false,
                billedDropdownStyle: '',
                showTdsDropdown: false,
                tdsDropdownStyle: '',
                showDiscountDropdown: false,
                discountDropdownStyle: ''
            }))
            : row.demandRows
    }));
}






    loadData() {
        getBookings({
            viewName: this.selectedlistView,
            searchTerm: this.searchKey
            //timeStamp: Date.now()
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
    const iconRect = event.currentTarget.getBoundingClientRect();
    const tooltipLeft = Math.max(0, iconRect.left - 180);
    const tooltipTop = iconRect.bottom + 4;
    const tooltipStyle = `position:fixed; z-index:9999; top:${tooltipTop}px; left:${tooltipLeft}px; background:#fff; border:1px solid #dddbda; border-radius:4px; padding:8px; min-width:220px; max-width:320px; box-shadow:0 4px 12px rgba(0,0,0,0.25); font-size:12px;`;

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
    dispositionHistory: row.Id === bookingId ? result : [],
    hasDispositionHistory: row.Id === bookingId ? result.length > 0 : false,
    dispositionTooltipStyle: row.Id === bookingId ? tooltipStyle : ''
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
    const iconRect = event.currentTarget.getBoundingClientRect();
    const tooltipLeft = Math.max(0, iconRect.left - 180);
    const tooltipTop = iconRect.bottom + 4;
    const tooltipStyle = `position:fixed; z-index:9999; top:${tooltipTop}px; left:${tooltipLeft}px; background:#fff; border:1px solid #dddbda; border-radius:4px; padding:8px; min-width:220px; max-width:320px; box-shadow:0 4px 12px rgba(0,0,0,0.25); font-size:12px;`;

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
                collectibleHistory: row.Id === bookingId ? formatted : (row.collectibleHistory || []),
                collectibleTooltipStyle: row.Id === bookingId ? tooltipStyle : ''
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
    const iconRect = event.currentTarget.getBoundingClientRect();
    const tooltipLeft = Math.max(0, iconRect.left - 180);
    const tooltipTop = iconRect.bottom + 4;
    const tooltipStyle = `position:fixed; z-index:9999; top:${tooltipTop}px; left:${tooltipLeft}px; background:#fff; border:1px solid #dddbda; border-radius:4px; padding:8px; min-width:220px; max-width:320px; box-shadow:0 4px 12px rgba(0,0,0,0.25); font-size:12px;`;

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
                subCategoryHistory: row.Id === bookingId ? formatted : (row.subCategoryHistory || []),
                subCategoryTooltipStyle: row.Id === bookingId ? tooltipStyle : ''
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

/*
// mouse event for partial payment amount
handlePartialPaymentMouseOver(event) {

    const demandId = event.currentTarget.dataset.id;

    getPartialPaymentHistory({ milestoneId })
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

*/


// mouse event for partial payment amount
handlePartialPaymentMouseOver(event) {

    const milestoneId = event.currentTarget.dataset.id;
    const iconRect = event.currentTarget.getBoundingClientRect();
    const tooltipLeft = Math.max(0, iconRect.left - 180);


    //const tooltipStyle = `position:fixed; z-index:9999; top:${tooltipTop}px; left:${tooltipLeft}px; background:#fff; border:1px solid #dddbda; border-radius:4px; padding:8px; min-width:220px; max-width:320px; box-shadow:0 4px 12px rgba(0,0,0,0.25); font-size:12px;`;

    getPartialPaymentHistory({ milestoneId })
        .then(result => {

            const history = result.map(item => ({
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


            // Estimate tooltip height dynamically
const estimatedHeight = Math.max(120, history.length * 42);

// Default position: above the icon
let tooltipTop = iconRect.top - estimatedHeight - 8;

// If there isn't enough room above, show below
if (tooltipTop < 10) {
    tooltipTop = iconRect.bottom + 4;
}

const tooltipStyle = `
position:fixed;
z-index:9999;
top:${tooltipTop}px;
left:${tooltipLeft}px;
background:#fff;
border:1px solid #dddbda;
border-radius:4px;
padding:8px;
min-width:220px;
max-width:320px;
box-shadow:0 4px 12px rgba(0,0,0,0.25);
font-size:12px;
`;

            this.visibleRows = this.visibleRows.map(row => ({
                ...row,
                demandRows: row.demandRows
                    ? row.demandRows.map(d =>
                        d.Id === milestoneId
                            ? {
                                ...d,
                                showPartialPaymentHistory: true,
                                partialPaymentHistory: history,
                                partialPaymentTooltipStyle: tooltipStyle
                            }
                            : d
                    )
                    : row.demandRows
            }));
        })
        .catch(error => {
            console.error('Failed to fetch partial payment history:', error);
        });
}

handlePartialPaymentMouseOut(event) {

    const milestoneId = event.currentTarget.dataset.id;

    this.visibleRows = this.visibleRows.map(row => ({
        ...row,
        demandRows: row.demandRows
            ? row.demandRows.map(d =>
                d.Id === milestoneId
                    ? { ...d, showPartialPaymentHistory: false }
                    : d
            )
            : row.demandRows
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
        //this.visibleRows = this.allData.map(row => ({
        this.visibleRows = this.allData.map((row, index) => ({
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
            ActivityRequiredForCollectionLabel: row.ActivityRequiredForCollection || 'None',
            showActivityDropdown: false,
            activityDropdownStyle: '',
            activityOptionsWithState: this.buildOptionsWithState(ACTIVITY_OPTIONS, row.ActivityRequiredForCollection || 'None'),
            CollectibleNonCollectibleLabel: row.CollectibleNonCollectible || '-None-',
showCollectibleDropdown: false,
collectibleDropdownStyle: '',
collectibleOptionsWithState: this.buildOptionsWithState(COLLECTIBLE_OPTIONS, row.CollectibleNonCollectible || ''),

SubCategoryLabel: row.SubCategory || 'Select an Option',
showSubCategoryDropdown: false,
subCategoryDropdownStyle: '',
subCategoryOptionsWithState: this.buildOptionsWithState(
    (row.CollectibleNonCollectible === 'Non-Collectible') ? NON_COLLECTIBLE_SUB_OPTIONS : COLLECTIBLE_SUB_OPTIONS,
    row.SubCategory || ''
),
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
            
            ActivityRequiredForCollection: row.ActivityRequiredForCollection || 'None',
            BankName: row.BankName,
Mortgage: row.Mortgage,
SanctionDate: row.SanctionDate,
WelcomeEmailDate: row.WelcomeEmailDate,

showBookingInfo: false,
bookingInfoStyle: '',
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

handleBookingInfoMouseOver(event) {

    const bookingId = event.currentTarget.dataset.id;

    const iconRect = event.currentTarget.getBoundingClientRect();

    const tooltipLeft = Math.max(0, iconRect.left - 100);

    const tooltipTop = iconRect.bottom + 4;

    const tooltipStyle =
        `position:fixed;
         z-index:9999;
         top:${tooltipTop}px;
         left:${tooltipLeft}px;
         background:#fff;
         border:1px solid #dddbda;
         border-radius:4px;
         padding:10px;
         min-width:300px;
         box-shadow:0 4px 12px rgba(0,0,0,.25);`;

    this.visibleRows = this.visibleRows.map(row => ({

        ...row,

        showBookingInfo: row.Id === bookingId,

        bookingInfoStyle:
            row.Id === bookingId ? tooltipStyle : ''

    }));
}

handleBookingInfoMouseOut(event) {

    const bookingId = event.currentTarget.dataset.id;

    this.visibleRows = this.visibleRows.map(row => {

        if (row.Id === bookingId) {

            return {

                ...row,

                showBookingInfo: false

            };
        }

        return row;

    });

}
buildOptionsWithState(options, value) {
    return options.map(opt => ({
        ...opt,
        isSelected: opt.value === value,
        optionClass: opt.value === value
            ? 'slds-listbox__option slds-listbox__option_plain slds-media_small slds-is-selected'
            : 'slds-listbox__option slds-listbox__option_plain slds-media_small'
    }));
}


    buildStars(ratingValue) {
        const rating = parseInt(ratingValue, 10) || 0;
        return [1, 2, 3, 4, 5].map(num => ({
            value: num,
            classMap: num <= rating ? 'star filled' : 'star'
        }));
    }


toggleCollectibleDropdown(event) {
    event.preventDefault();
    event.stopPropagation();
    const bookingId = event.currentTarget.dataset.id;
    const rect = event.currentTarget.getBoundingClientRect();

    this.visibleRows = this.visibleRows.map(row => {
        if (row.Id === bookingId) {
            const willOpen = !row.showCollectibleDropdown;
            const style = willOpen
                ? `position:fixed; top:${rect.bottom}px; left:${rect.left}px; width:${rect.width}px; box-sizing:border-box; z-index:9999;`
                : '';
            return { ...row, showCollectibleDropdown: willOpen, collectibleDropdownStyle: style, showSubCategoryDropdown: false };
        }
        return { ...row, showCollectibleDropdown: false, collectibleDropdownStyle: '' };
    });
}

selectCollectibleOption(event) {
    event.preventDefault();
    event.stopPropagation();
    const bookingId = event.currentTarget.dataset.id;
    const value = event.currentTarget.dataset.value;
    const label = event.currentTarget.dataset.label;
this.dirtyBookingIds.add(bookingId);
    this.visibleRows = this.visibleRows.map(row => {
        if (row.Id !== bookingId) return row;

        const isCollectible = value === 'Collectible';
        const isNonCollectible = value === 'Non-Collectible';

        return {
            ...row,
            CollectibleNonCollectible: value,
            CollectibleNonCollectibleLabel: label,
            showCollectibleDropdown: false,
            collectibleDropdownStyle: '',
            collectibleOptionsWithState: this.buildOptionsWithState(COLLECTIBLE_OPTIONS, value),
            isCollectible,
            isNonCollectible,
            SubCategory: '',
            SubCategoryLabel: 'Select an Option',
            subCategoryError: false,
            subCategoryOptionsWithState: this.buildOptionsWithState(
                isNonCollectible ? NON_COLLECTIBLE_SUB_OPTIONS : COLLECTIBLE_SUB_OPTIONS,
                ''
            )
        };
    });
}

toggleSubCategoryDropdown(event) {
    event.preventDefault();
    event.stopPropagation();
    const bookingId = event.currentTarget.dataset.id;
    const rect = event.currentTarget.getBoundingClientRect();

    this.visibleRows = this.visibleRows.map(row => {
        if (row.Id === bookingId) {
            const willOpen = !row.showSubCategoryDropdown;
            const style = willOpen
                ? `position:fixed; top:${rect.bottom}px; left:${rect.left}px; width:${rect.width}px; box-sizing:border-box; z-index:9999;`
                : '';
            return { ...row, showSubCategoryDropdown: willOpen, subCategoryDropdownStyle: style, showCollectibleDropdown: false };
        }
        return { ...row, showSubCategoryDropdown: false, subCategoryDropdownStyle: '' };
    });
}

selectSubCategoryOption(event) {
    event.preventDefault();
    event.stopPropagation();
    const bookingId = event.currentTarget.dataset.id;
    const value = event.currentTarget.dataset.value;
    const label = event.currentTarget.dataset.label;
this.dirtyBookingIds.add(bookingId);
    this.visibleRows = this.visibleRows.map(row => {
        if (row.Id !== bookingId) return row;
        return {
            ...row,
            SubCategory: value,
            SubCategoryLabel: label,
            showSubCategoryDropdown: false,
            subCategoryDropdownStyle: '',
            subCategoryError: false,
            subCategoryOptionsWithState: this.buildOptionsWithState(
                row.isNonCollectible ? NON_COLLECTIBLE_SUB_OPTIONS : COLLECTIBLE_SUB_OPTIONS,
                value
            )
        };
    });
}

toggleCollectibleDropdown(event) {
    event.preventDefault();
    event.stopPropagation();
    const bookingId = event.currentTarget.dataset.id;
    const rect = event.currentTarget.getBoundingClientRect();

    this.visibleRows = this.visibleRows.map(row => {
        if (row.Id === bookingId) {
            const willOpen = !row.showCollectibleDropdown;
            const style = willOpen
                ? `position:fixed; top:${rect.bottom}px; left:${rect.left}px; width:${rect.width}px; box-sizing:border-box; z-index:9999;`
                : '';
            return {
                ...row,
                showCollectibleDropdown: willOpen,
                collectibleDropdownStyle: style,
                showSubCategoryDropdown: false,
                subCategoryDropdownStyle: '',
                showActivityDropdown: false,
                activityDropdownStyle: ''
            };
        }
        return {
            ...row,
            showCollectibleDropdown: false,
            collectibleDropdownStyle: '',
            showSubCategoryDropdown: false,
            subCategoryDropdownStyle: '',
            showActivityDropdown: false,
            activityDropdownStyle: ''
        };
    });
}

toggleSubCategoryDropdown(event) {
    event.preventDefault();
    event.stopPropagation();
    const bookingId = event.currentTarget.dataset.id;
    const rect = event.currentTarget.getBoundingClientRect();

    this.visibleRows = this.visibleRows.map(row => {
        if (row.Id === bookingId) {
            const willOpen = !row.showSubCategoryDropdown;
            const style = willOpen
                ? `position:fixed; top:${rect.bottom}px; left:${rect.left}px; width:${rect.width}px; box-sizing:border-box; z-index:9999;`
                : '';
            return {
                ...row,
                showSubCategoryDropdown: willOpen,
                subCategoryDropdownStyle: style,
                showCollectibleDropdown: false,
                collectibleDropdownStyle: '',
                showActivityDropdown: false,
                activityDropdownStyle: ''
            };
        }
        return {
            ...row,
            showSubCategoryDropdown: false,
            subCategoryDropdownStyle: '',
            showCollectibleDropdown: false,
            collectibleDropdownStyle: '',
            showActivityDropdown: false,
            activityDropdownStyle: ''
        };
    });
}

toggleActivityDropdown(event) {
    event.preventDefault();
    event.stopPropagation();
    const bookingId = event.currentTarget.dataset.id;
    const rect = event.currentTarget.getBoundingClientRect();

    this.visibleRows = this.visibleRows.map(row => {
        if (row.Id === bookingId) {
            const willOpen = !row.showActivityDropdown;
            const style = willOpen
                ? `position:fixed; top:${rect.bottom}px; left:${rect.left}px; width:${rect.width}px; box-sizing:border-box; z-index:9999;`
                : '';
            return {
                ...row,
                showActivityDropdown: willOpen,
                activityDropdownStyle: style,
                showCollectibleDropdown: false,
                collectibleDropdownStyle: '',
                showSubCategoryDropdown: false,
                subCategoryDropdownStyle: ''
            };
        }
        return {
            ...row,
            showActivityDropdown: false,
            activityDropdownStyle: '',
            showCollectibleDropdown: false,
            collectibleDropdownStyle: '',
            showSubCategoryDropdown: false,
            subCategoryDropdownStyle: ''
        };
    });
}


selectActivityOption(event) {
    event.preventDefault();
    event.stopPropagation();

    const bookingId = event.currentTarget.dataset.id;
    const value = event.currentTarget.dataset.value;
    const label = event.currentTarget.dataset.label;
this.dirtyBookingIds.add(bookingId);
    this.visibleRows = this.visibleRows.map(row => {
        if (row.Id !== bookingId) {
            return row;
        }

        return {
            ...row,
            ActivityRequiredForCollection: value,
            ActivityRequiredForCollectionLabel: label,
            showActivityDropdown: false,
            activityDropdownStyle: '',
            activityOptionsWithState: this.buildOptionsWithState(
                ACTIVITY_OPTIONS,
                value
            )
        };
    });
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
        row.demandRows = milestones.map((m, idx) => this.buildMilestoneRow(m, idx));
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

    buildMilestoneRow(d , index) {
        console.log('Milestone Row Data', JSON.stringify(d));   // to test
        /*
        const caseStatus = d.CaseStatus || '';
        const logCaseDisabled = !!d.CaseNumber || CASE_STATUSES_DISABLE_LOG.includes(caseStatus);
        const logCaseDisabledReason = d.CaseNumber
            ? 'TPR Case is already created'
            : (logCaseDisabled ? `Case is ${caseStatus}` : '');
            */
            const caseStatus = d.CaseStatus || '';

const today = new Date();

const billingDueDate = d.BillingDueDate
    ? new Date(d.BillingDueDate)
    : null;

const isCurrentMonth =
    billingDueDate &&
    billingDueDate.getFullYear() === today.getFullYear() &&
    billingDueDate.getMonth() === today.getMonth();

const isOverdue =
    billingDueDate &&
    billingDueDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());

const logCaseDisabled =
    !!d.CaseNumber ||
    CASE_STATUSES_DISABLE_LOG.includes(caseStatus) ||
    isCurrentMonth ||
    isOverdue;

const logCaseDisabledReason =
    d.CaseNumber
        ? 'TPR Case is already created'
        : CASE_STATUSES_DISABLE_LOG.includes(caseStatus)
            ? `Case is ${caseStatus}`
            : (isCurrentMonth || isOverdue)
                ? ' Due Date is in the current month or overdue'
                : '';


                //  Due Date style
                let billingDueDateStyle = '';

                if (billingDueDate && isOverdue) {
                    billingDueDateStyle = 'color:red;font-weight:bold;';
                }

            const dropdownZ = 500 - index;
const dropdownWrapperStyle = `position:relative; z-index:${dropdownZ};`;

// ↓ ADD THIS BLOCK ↓
const defaultBilledValue = d.DemandId ? (d.BilledUnbilled || '') : 'Unbilled';
const billedOptionsWithState = BILLED_OPTIONS.map(opt => ({
    ...opt,
    isSelected: opt.value === defaultBilledValue,
    optionClass: opt.value === defaultBilledValue
        ? 'slds-listbox__option slds-listbox__option_plain slds-media_small slds-is-selected'
        : 'slds-listbox__option slds-listbox__option_plain slds-media_small'
}));
// ↑ ADD THIS BLOCK ↑

const tdsOptionsWithState = TDS_OPTIONS.map(opt => ({
    ...opt,
    isSelected: opt.value === (d.TdsApplicable || ''),
    optionClass: opt.value === (d.TdsApplicable || '')
        ? 'slds-listbox__option slds-listbox__option_plain slds-media_small slds-is-selected'
        : 'slds-listbox__option slds-listbox__option_plain slds-media_small'
}));

const discountOptionsWithState = YES_NO_OPTIONS.map(opt => ({
    ...opt,
    isSelected: opt.value === (d.DiscountApplied || ''),
    optionClass: opt.value === (d.DiscountApplied || '')
        ? 'slds-listbox__option slds-listbox__option_plain slds-media_small slds-is-selected'
        : 'slds-listbox__option slds-listbox__option_plain slds-media_small'
}));

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
            BillingDueDateStyle: billingDueDateStyle,
            BillingAmtBasic: d.BillingAmtBasic != null ? d.BillingAmtBasic : '',
           // TDS1Percent: d.TDSTax != null ? d.TDSTax : '',
           TDS1Percent: d.TdsAmount != null ? d.TdsAmount : '',
            TotalBilledLessTDS: d.TotalBilledLessTDS != null ? d.TotalBilledLessTDS : '',
            MilestoneName: d.MilestoneName || '',
            BilledUnbilled: defaultBilledValue,
            showBilledDropdown: false,
            billedDropdownStyle: '',
            BilledUnbilledLabel: defaultBilledValue || '-None-',
            billedOptionsWithState: billedOptionsWithState,
                        TDSApplicable: d.TdsApplicable || 'Applicable',
            showTdsDropdown: false,
            tdsDropdownStyle: '',
            TDSApplicableLabel:
                d.TdsApplicable === 'Not Applicable'
                    ? 'Not Applicable'
                    : 'Applicable',
            tdsOptionsWithState: TDS_OPTIONS.map(opt => ({
                ...opt,
                isSelected: opt.value === (d.TdsApplicable || 'Applicable'),
                optionClass:
                    opt.value === (d.TdsApplicable || 'Applicable')
                        ? 'slds-listbox__option slds-listbox__option_plain slds-media_small slds-is-selected'
                        : 'slds-listbox__option slds-listbox__option_plain slds-media_small'
            })),
            

            //ProjectedPaymentDate: d.ProjectedDateOfPayment || null,

            DiscountApplied: d.DiscountApplied || '',
            showDiscountDropdown: false,
            discountDropdownStyle: '',
            DiscountAppliedLabel: d.DiscountApplied || '-None-',
            discountOptionsWithState: discountOptionsWithState,
            ProjectedPaymentDate: d.ProjectedDateOfPayment || null,
            DiscountApplied: d.DiscountApplied || '',
            //EarlierDays: earlierDays,
            EarlierDays: earlierDays,
            earlierDaysStyle:
                Number(earlierDays) > 0
                    ? 'color:green;font-weight:bold;'
                    : Number(earlierDays) < 0
                        ? 'color:red;font-weight:bold;'
                        : '',
            DiscountCalculatedValue: d.DiscountAmount != null ? d.DiscountAmount : '',
            logCaseDisabled: logCaseDisabled,
            logCaseDisabledReason: logCaseDisabledReason,
            dropdownWrapperStyle: dropdownWrapperStyle,
            //CaseStatus: caseStatus,
          //  PartialPaymentAmount: d.PartialPaymentAmount != null ? d.PartialPaymentAmount : null,
           // CaseNumber: d.CaseNumber || '',
           // CaseId: d.CaseId || null,
           CaseStatus: caseStatus,
            PartialPaymentAmount: d.PartialPaymentAmount != null ? d.PartialPaymentAmount : null,
            showPartialPaymentHistory: false,
            partialPaymentHistory: [],
            partialPaymentTooltipStyle: '',
            CaseNumber: d.CaseNumber || '',
            CaseId: d.CaseId || null,
            ApprovalStatus: d.ApprovalStatus || '',
approvalStatusDisplay: d.ApprovalStatus ? d.ApprovalStatus : 'Not Found',
showApprovalTooltip: false,
showApprovalTooltip: false,
approvalTooltipStyle: '',
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
        demand.earlierDaysStyle =
    Number(demand.EarlierDays) > 0
        ? 'color:green;font-weight:bold;'
        : Number(demand.EarlierDays) < 0
            ? 'color:red;font-weight:bold;'
            : '';

        const billingAmt = Number(demand.BillingAmtBasic) || 0;
        if (demand.TDSApplicable === 'Applicable') {
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

const today = new Date();

const billingDueDate = demand.BillingDueDate
    ? new Date(demand.BillingDueDate)
    : null;

// Compare only the date portion
const currentDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
);

const isCurrentMonth =
    billingDueDate &&
    billingDueDate.getFullYear() === currentDate.getFullYear() &&
    billingDueDate.getMonth() === currentDate.getMonth();

const isOverdue =
    billingDueDate &&
    billingDueDate < currentDate;

demand.logCaseDisabled =
    !!demand.CaseNumber ||
    CASE_STATUSES_DISABLE_LOG.includes(demand.CaseStatus || '') ||
    isCurrentMonth ||
    isOverdue;

demand.logCaseDisabledReason =
    isCurrentMonth || isOverdue
        ? 'Due Date is in the current month or overdue.'
        : '';


        return demand;
    }




    toggleBilledDropdown(event) {
    event.preventDefault();
    event.stopPropagation();
    const demandId = event.currentTarget.dataset.id;
    const trigger = event.currentTarget;
    const rect = trigger.getBoundingClientRect();

    // close all others, open/close this one
    this.visibleRows = this.visibleRows.map(row => ({
        ...row,
        demandRows: row.demandRows
            ? row.demandRows.map(d => {
                if (d.Id === demandId) {
                    const willOpen = !d.showBilledDropdown;
                    const style = willOpen
                        ? `position:fixed; top:${rect.bottom}px; left:${rect.left}px; width:${rect.width}px; box-sizing:border-box; z-index:9999;`
                        : '';
                    //return { ...d, showBilledDropdown: willOpen, billedDropdownStyle: style };
                    return { ...d, showBilledDropdown: willOpen, billedDropdownStyle: style, showTdsDropdown: false, showDiscountDropdown: false };
                }
                return { ...d, showBilledDropdown: false, billedDropdownStyle: '' };
            })
            : row.demandRows
    }));
}

selectBilledOption(event) {
    event.preventDefault();
    event.stopPropagation();
    const demandId = event.currentTarget.dataset.id;
    const value = event.currentTarget.dataset.value;
    const label = event.currentTarget.dataset.label;
this.dirtyMilestoneIds.add(demandId);
    this.visibleRows = this.visibleRows.map(bookingRow => ({
        ...bookingRow,
        demandRows: bookingRow.demandRows
            ? bookingRow.demandRows.map(d => {
                if (d.Id !== demandId) return d;
                const billedOptionsWithState = BILLED_OPTIONS.map(opt => ({
                    ...opt,
                    isSelected: opt.value === value,
                    optionClass: opt.value === value
                        ? 'slds-listbox__option slds-listbox__option_plain slds-media_small slds-is-selected'
                        : 'slds-listbox__option slds-listbox__option_plain slds-media_small'
                }));
                return {
                    ...d,
                    BilledUnbilled: value,
                    BilledUnbilledLabel: label,
                    showBilledDropdown: false,
                    billedDropdownStyle: '',
                    billedOptionsWithState: billedOptionsWithState
                };
            })
            : bookingRow.demandRows
    }));
}



toggleTdsDropdown(event) {
    event.preventDefault();
    event.stopPropagation();
    const demandId = event.currentTarget.dataset.id;
    const trigger = event.currentTarget;
    const rect = trigger.getBoundingClientRect();

    this.visibleRows = this.visibleRows.map(row => ({
        ...row,
        demandRows: row.demandRows
            ? row.demandRows.map(d => {
                if (d.Id === demandId) {
                    const willOpen = !d.showTdsDropdown;
                    const style = willOpen
                        ? `position:fixed; top:${rect.bottom}px; left:${rect.left}px; width:${rect.width}px; box-sizing:border-box; z-index:9999;`
                        : '';
                    return { ...d, showTdsDropdown: willOpen, tdsDropdownStyle: style, showBilledDropdown: false, showDiscountDropdown: false };
                }
                return { ...d, showTdsDropdown: false, tdsDropdownStyle: '' };
            })
            : row.demandRows
    }));
}

selectTdsOption(event) {
    event.preventDefault();
    event.stopPropagation();
    const demandId = event.currentTarget.dataset.id;
    const value = event.currentTarget.dataset.value;
    const label = event.currentTarget.dataset.label;

    this.visibleRows = this.visibleRows.map(bookingRow => ({
        ...bookingRow,
        demandRows: bookingRow.demandRows
            ? bookingRow.demandRows.map(d => {
                if (d.Id !== demandId) return d;
                const tdsOptionsWithState = TDS_OPTIONS.map(opt => ({
                    ...opt,
                    isSelected: opt.value === value,
                    optionClass: opt.value === value
                        ? 'slds-listbox__option slds-listbox__option_plain slds-media_small slds-is-selected'
                        : 'slds-listbox__option slds-listbox__option_plain slds-media_small'
                }));
                const updated = {
                    ...d,
                    TDSApplicable: value,
                    //TDSApplicableLabel: label,
                    TDSApplicableLabel:
                    value === 'Applicable'
                        ? 'Applicable'
                        : 'Not Applicable',
                    showTdsDropdown: false,
                    tdsDropdownStyle: '',
                    tdsOptionsWithState: tdsOptionsWithState
                };
                return this.recomputeDemandRow(updated);
            })
            : bookingRow.demandRows
    }));
}

toggleDiscountDropdown(event) {
    event.preventDefault();
    event.stopPropagation();
    const demandId = event.currentTarget.dataset.id;
    const trigger = event.currentTarget;
    const rect = trigger.getBoundingClientRect();

    this.visibleRows = this.visibleRows.map(row => ({
        ...row,
        demandRows: row.demandRows
            ? row.demandRows.map(d => {
                if (d.Id === demandId) {
                    const willOpen = !d.showDiscountDropdown;
                    const style = willOpen
                        ? `position:fixed; top:${rect.bottom}px; left:${rect.left}px; width:${rect.width}px; box-sizing:border-box; z-index:9999;`
                        : '';
                    return { ...d, showDiscountDropdown: willOpen, discountDropdownStyle: style, showBilledDropdown: false, showTdsDropdown: false };
                }
                return { ...d, showDiscountDropdown: false, discountDropdownStyle: '' };
            })
            : row.demandRows
    }));
}

selectDiscountOption(event) {
    event.preventDefault();
    event.stopPropagation();
    const demandId = event.currentTarget.dataset.id;
    const value = event.currentTarget.dataset.value;
    const label = event.currentTarget.dataset.label;
this.dirtyMilestoneIds.add(demandId);
    this.visibleRows = this.visibleRows.map(bookingRow => ({
        ...bookingRow,
        demandRows: bookingRow.demandRows
            ? bookingRow.demandRows.map(d => {
                if (d.Id !== demandId) return d;
                const discountOptionsWithState = YES_NO_OPTIONS.map(opt => ({
                    ...opt,
                    isSelected: opt.value === value,
                    optionClass: opt.value === value
                        ? 'slds-listbox__option slds-listbox__option_plain slds-media_small slds-is-selected'
                        : 'slds-listbox__option slds-listbox__option_plain slds-media_small'
                }));
                const updated = {
                    ...d,
                    DiscountApplied: value,
                    DiscountAppliedLabel: label,
                    showDiscountDropdown: false,
                    discountDropdownStyle: '',
                    discountOptionsWithState: discountOptionsWithState
                };
                return this.recomputeDemandRow(updated);
            })
            : bookingRow.demandRows
    }));
}


    /*
    handleDemandFieldChange(event) {
        const demandId = event.currentTarget.dataset.id;
        const field = event.currentTarget.dataset.field;
       let value = event.detail ? event.detail.value : event.target.value;

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
    */

   handleDemandFieldChange(event) {
    // event.target is always stable; event.currentTarget can go null on native inputs
    const el = event.target;
    const demandId = el.dataset.id;
    const field = el.dataset.field;
    const value = event.detail ? event.detail.value : el.value;

    if (!demandId || !field) return; // safety guard
    this.dirtyMilestoneIds.add(demandId);
    // ── Block negative Partial Payment Amount ──────────────────────────
    if (field === 'PartialPaymentAmount' && value !== '' && value !== null) {
        const numValue = Number(value);
        if (numValue < 0) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Invalid Amount',
                message: 'Partial Payment Amount cannot be negative.',
                variant: 'error'
            }));
            return;
        }
    }

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


handleCaseApprovalMouseOver(event) {
    const milestoneId = event.currentTarget.dataset.approvalId;
    const iconRect = event.currentTarget.getBoundingClientRect();

    // Estimate tooltip height (adjust if you add more lines later)
    const estimatedHeight = 70;

    // Default: show above the trigger
    let tooltipTop = iconRect.top - estimatedHeight - 8;

    // Not enough room above? show below instead
    if (tooltipTop < 10) {
        tooltipTop = iconRect.bottom + 4;
    }

    const tooltipLeft = Math.max(0, iconRect.right - 220);

    const tooltipStyle = `
position:fixed;
z-index:9999;
top:${tooltipTop}px;
left:${tooltipLeft}px;
background:#fff;
border:1px solid #dddbda;
border-radius:4px;
padding:10px;
min-width:200px;
box-shadow:0 4px 12px rgba(0,0,0,0.25);
font-size:12px;
`;

    this.visibleRows = this.visibleRows.map(row => ({
        ...row,
        demandRows: row.demandRows
            ? row.demandRows.map(d =>
                d.Id === milestoneId
                    ? { ...d, showApprovalTooltip: true, approvalTooltipStyle: tooltipStyle }
                    : d
            )
            : []
    }));
}

handleCaseApprovalMouseOut(event) {
    const milestoneId = event.currentTarget.dataset.approvalId;
    this.visibleRows = this.visibleRows.map(row => ({
        ...row,
        demandRows: row.demandRows
            ? row.demandRows.map(d =>
                d.Id === milestoneId
                    ? { ...d, showApprovalTooltip: false }
                    : d
            )
            : []
    }));
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
        this.dirtyBookingIds.add(recordId);
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
    // event.target is stable for real native-input change events.
    // event.currentTarget is what confirmDateModal()'s synthetic event supplies.
    const el = event.target || event.currentTarget;
    const field = el.dataset.field;
    const recordId = el.dataset.id;
    const value = event.detail ? event.detail.value : el.value;

    if (!recordId || !field) return; // safety guard

    this.dirtyBookingIds.add(recordId);

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
                    updated.CollectibleNonCollectibleLabel = 'Collectible';

                    updated.SubCategory = 'Promise to Pay';
                    updated.SubCategoryLabel = 'Promise to Pay';

                    updated.collectibleOptionsWithState =
                        this.buildOptionsWithState(
                            COLLECTIBLE_OPTIONS,
                            'Collectible'
                        );

                    updated.subCategoryOptionsWithState =
                        this.buildOptionsWithState(
                            COLLECTIBLE_SUB_OPTIONS,
                            'Promise to Pay'
                        );

                    updated.isCollectible = true;
                    updated.isNonCollectible = false;

                    updated.disableCollectible = true;
                    updated.disableSubCategory = true;

                    updated.subCategoryError = false;

                } else {

                    updated.disableCollectible = false;
                    updated.disableSubCategory = false;

                    // Keep existing values, just make them editable
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

            // ── Update Last_Call_Date__c after successful call initiation ──
            return updateLastCallDate({ bookingId: bookingId });
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
    let hasRemarksError = false;
 
    this.visibleRows = this.visibleRows.map(row => {
        let updated = { ...row, subCategoryError: false, remarksError: false };
        if (!this.dirtyBookingIds.has(row.Id)) {
            return updated;
        }
        if (row.isNonCollectible && !row.SubCategory) {
            hasValidationError = true;
            updated.subCategoryError = true;
        }
 
        if (row.isNonCollectible && !row.Remarks) {
            hasRemarksError = true;
            updated.remarksError = true;
        }
 
        return updated;
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
 
    if (hasRemarksError) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Validation Error',
            message: 'Please enter Remarks for all Non-Collectible bookings before saving.',
            variant: 'error',
            mode: 'dismissable'
        }));
        return;
    }

        // Validate Partial Payment Amount
for (const bookingRow of this.visibleRows) {

    if (!bookingRow.demandRows) continue;

    for (const demand of bookingRow.demandRows) {
        if (!this.dirtyMilestoneIds.has(demand.Id)) continue;
        const partialAmt = Number(demand.PartialPaymentAmount) || 0;
        const netAmt = Number(demand.NetReceivedAmount) || 0;


        if (partialAmt < 0) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: '',
                    message: `Partial Payment Amount cannot be negative for Demand ${demand.DemandName}.`,
                    variant: 'error'
                })
            );
            return;
        }

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


        /*
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
            */
            if (this.dirtyBookingIds.size === 0 && this.dirtyMilestoneIds.size === 0) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Nothing to Save',
                message: 'No changes were made.',
                variant: 'info'
            }));
            return;
        }

        this.isSaving = true;

        const bookingUpdates = this.visibleRows
            .filter(row => this.dirtyBookingIds.has(row.Id))
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
                if (!this.dirtyMilestoneIds.has(demand.Id)) return;
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
                    this.dirtyBookingIds = new Set();
                    this.dirtyMilestoneIds = new Set();
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
