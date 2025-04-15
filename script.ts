// script.js
console.log('Script loaded'); // Confirm script runs

// System state
let systemConfig = {
    virtualSpace: 4096,  // bytes
    physicalSpace: 2048, // bytes
    pageSize: 512,       // bytes
    valid: false
};

let pageTable = [];
let fifoQueue = [];
let pageFaults = 0;

// DOM elements
const virtualSpaceInput = document.getElementById('virtualSpace');
const physicalSpaceInput = document.getElementById('physicalSpace');
const pageSizeInput = document.getElementById('pageSize');
const validateBtn = document.getElementById('validateBtn');
const configError = document.getElementById('configError');
const configSuccess = document.getElementById('configSuccess');
const autoCorrectSection = document.getElementById('autoCorrectSection');
const recommendationsDiv = document.getElementById('recommendations');
const acceptCorrectionBtn = document.getElementById('acceptCorrectionBtn');
const ignoreCorrectionBtn = document.getElementById('ignoreCorrectionBtn');
const accessSequenceInput = document.getElementById('accessSequence');
const simulateBtn = document.getElementById('simulateBtn');
const pageTableContainer = document.getElementById('pageTableContainer');
const fifoQueueDiv = document.getElementById('fifoQueue');
const conversionTypeSelect = document.getElementById('conversionType');
const inputAddress = document.getElementById('inputAddress');
const convertBtn = document.getElementById('convertBtn');
const conversionResult = document.getElementById('conversionResult');
const conversionError = document.getElementById('conversionError');

console.log('DOM elements assigned:', { validateBtn }); // Confirm button element

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired');
    validateBtn.addEventListener('click', () => {
        console.log('Validate button clicked');
        validateConfiguration();
    });
    acceptCorrectionBtn.addEventListener('click', acceptCorrection);
    ignoreCorrectionBtn.addEventListener('click', ignoreCorrection);
    simulateBtn.addEventListener('click', simulateAccesses);
    convertBtn.addEventListener('click', performConversion);
    
    // Initialize page table
    validateConfiguration();
});

function validateConfiguration() {
    console.log('validateConfiguration called');
    configError.textContent = '';
    configSuccess.textContent = '';
    autoCorrectSection.style.display = 'none';
    
    const virtualSpace = parseInt(virtualSpaceInput.value);
    const physicalSpace = parseInt(physicalSpaceInput.value);
    const pageSize = parseInt(pageSizeInput.value);
    
    console.log('Inputs:', { virtualSpace, physicalSpace, pageSize });
    
    let errors = [];
    let recommendations = [];
    
    // Basic checks
    if (!virtualSpace || virtualSpace <= 0) {
        errors.push('Virtual space must be positive.');
    }
    if (!physicalSpace || physicalSpace <= 0) {
        errors.push('Physical space must be positive.');
    }
    if (!pageSize || pageSize <= 0) {
        errors.push('Page size must be positive.');
    }
    
    // Check physical space ratio
    if (virtualSpace && physicalSpace && physicalSpace !== virtualSpace / 2) {
        errors.push(`Physical space should be half of virtual space (${virtualSpace / 2} bytes).`);
        recommendations.push(`Set physical space to ${virtualSpace / 2} bytes.`);
    }
    
    // Check divisibility
    if (virtualSpace && pageSize && virtualSpace % pageSize !== 0) {
        errors.push(`Virtual space (${virtualSpace} bytes) must be divisible by page size (${pageSize} bytes).`);
        recommendations.push(`Set page size to a divisor of ${virtualSpace} (e.g., ${findDivisor(virtualSpace)}).`);
    }
    if (physicalSpace && pageSize && physicalSpace % pageSize !== 0) {
        errors.push(`Physical space (${physicalSpace} bytes) must be divisible by page size (${pageSize} bytes).`);
        recommendations.push(`Set page size to a divisor of ${physicalSpace} (e.g., ${findDivisor(physicalSpace)}).`);
    }
    
    console.log('Validation results:', { errors, recommendations });
    
    if (errors.length > 0) {
        configError.innerHTML = errors.join('<br>');
        recommendationsDiv.innerHTML = recommendations.join('<br>');
        autoCorrectSection.style.display = 'block';
        systemConfig.valid = false;
        pageTableContainer.innerHTML = '<p>Please configure a valid system.</p>';
    } else {
        configSuccess.textContent = 'Configuration is valid!';
        systemConfig = {
            virtualSpace,
            physicalSpace,
            pageSize,
            valid: true
        };
        initializePageTable();
        updatePageTable();
    }
}

function acceptCorrection() {
    console.log('acceptCorrection called');
    const virtualSpace = parseInt(virtualSpaceInput.value);
    const pageSize = parseInt(pageSizeInput.value);
    
    // Set physical space to half of virtual space
    if (virtualSpace) {
        physicalSpaceInput.value = virtualSpace / 2;
    }
    
    // Find a valid page size that divides both
    if (virtualSpace && physicalSpaceInput.value) {
        let newPageSize = pageSize;
        while (newPageSize > 1 && (virtualSpace % newPageSize !== 0 || physicalSpaceInput.value % newPageSize !== 0)) {
            newPageSize = findDivisor(Math.min(virtualSpace, physicalSpaceInput.value));
        }
        pageSizeInput.value = newPageSize;
    }
    
    autoCorrectSection.style.display = 'none';
    validateConfiguration();
}

function ignoreCorrection() {
    console.log('ignoreCorrection called');
    autoCorrectSection.style.display = 'none';
    systemConfig = {
        virtualSpace: parseInt(virtualSpaceInput.value),
        physicalSpace: parseInt(physicalSpaceInput.value),
        pageSize: parseInt(pageSizeInput.value),
        valid: true
    };
    configSuccess.textContent = 'Configuration accepted.';
    initializePageTable();
    updatePageTable();
}

function initializePageTable() {
    console.log('initializePageTable called');
    const virtualPages = systemConfig.virtualSpace / systemConfig.pageSize;
    pageTable = [];
    fifoQueue = [];
    pageFaults = 0;
    
    for (let i = 0; i < virtualPages; i++) {
        pageTable.push({
            virtualIndex: i,
            physicalIndex: null,
            present: false
        });
    }
}

function updatePageTable() {
    console.log('updatePageTable called');
    if (!systemConfig.valid) {
        pageTableContainer.innerHTML = '<p>Please configure a valid system first.</p>';
        return;
    }
    
    const virtualPages = systemConfig.virtualSpace / systemConfig.pageSize;
    const physicalPages = systemConfig.physicalSpace / systemConfig.pageSize;
    
    let html = `
        <p>Virtual Pages: ${virtualPages}, Physical Pages: ${physicalPages}</p>
        <table>
            <thead>
                <tr>
                    <th>Virtual Index</th>
                    <th>Physical Index</th>
                    <th>Present</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    for (const entry of pageTable) {
        html += `
            <tr>
                <td>${entry.virtualIndex}</td>
                <td>${entry.physicalIndex !== null ? entry.physicalIndex : 'None'}</td>
                <td>${entry.present ? 'Yes' : 'No'}</td>
            </tr>
        `;
    }
    
    html += `</tbody></table>`;
    pageTableContainer.innerHTML = html;
    
    updateFifoQueueDisplay();
}

function updateFifoQueueDisplay() {
    console.log('updateFifoQueueDisplay called');
    fifoQueueDiv.innerHTML = `
        <p>Page Faults: ${pageFaults}</p>
        <p>FIFO Queue: [${fifoQueue.join(', ')}]</p>
    `;
}

function simulateAccesses() {
    console.log('simulateAccesses called');
    if (!systemConfig.valid) {
        configError.textContent = 'Please configure a valid system first.';
        return;
    }
    
    const sequence = accessSequenceInput.value.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
    const virtualPages = systemConfig.virtualSpace / systemConfig.pageSize;
    
    for (const vp of sequence) {
        if (vp < 0 || vp >= virtualPages) {
            configError.textContent = `Invalid virtual page: ${vp}`;
            return;
        }
        
        const pageEntry = pageTable[vp];
        if (!pageEntry.present) {
            handlePageFault(pageEntry);
        } else {
            // Move to end of FIFO queue to reflect recent access
            fifoQueue = fifoQueue.filter(x => x !== vp);
            fifoQueue.push(vp);
        }
    }
    
    updatePageTable();
    configSuccess.textContent = 'Access sequence simulated successfully!';
}

function handlePageFault(pageEntry) {
    console.log('handlePageFault called for page', pageEntry.virtualIndex);
    const physicalPages = systemConfig.physicalSpace / systemConfig.pageSize;
    let physicalIndex;
    
    // Check for free physical page
    const freePhysicalPage = findFreePhysicalPage();
    if (freePhysicalPage !== null) {
        physicalIndex = freePhysicalPage;
    } else {
        // Replace using FIFO
        const victimVirtualIndex = fifoQueue.shift();
        const victimEntry = pageTable[victimVirtualIndex];
        physicalIndex = victimEntry.physicalIndex;
        victimEntry.physicalIndex = null;
        victimEntry.present = false;
    }
    
    pageEntry.physicalIndex = physicalIndex;
    pageEntry.present = true;
    fifoQueue.push(pageEntry.virtualIndex);
    pageFaults++;
}

function findFreePhysicalPage() {
    console.log('findFreePhysicalPage called');
    const physicalPages = systemConfig.physicalSpace / systemConfig.pageSize;
    const usedPhysicalPages = new Set(pageTable.filter(entry => entry.present).map(entry => entry.physicalIndex));
    
    for (let i = 0; i < physicalPages; i++) {
        if (!usedPhysicalPages.has(i)) {
            return i;
        }
    }
    return null;
}

function performConversion() {
    console.log('performConversion called');
    conversionResult.textContent = '';
    conversionError.textContent = '';
    
    if (!systemConfig.valid) {
        conversionError.textContent = 'Please configure a valid system first.';
        return;
    }
    
    let addressValue = parseInt(inputAddress.value);
    if (isNaN(addressValue) || addressValue < 0) {
        conversionError.textContent = 'Invalid address.';
        return;
    }
    
    const conversionType = conversionTypeSelect.value;
    const virtualPages = systemConfig.virtualSpace / systemConfig.pageSize;
    const physicalPages = systemConfig.physicalSpace / systemConfig.pageSize;
    
    if (conversionType === 'virtualToPhysical') {
        if (addressValue >= systemConfig.virtualSpace) {
            conversionError.textContent = `Virtual address ${addressValue} exceeds virtual space (${systemConfig.virtualSpace}).`;
            return;
        }
        
        const virtualPageIndex = Math.floor(addressValue / systemConfig.pageSize);
        const offset = addressValue % systemConfig.pageSize;
        const pageEntry = pageTable[virtualPageIndex];
        
        if (!pageEntry.present) {
            conversionError.textContent = `Page fault: Virtual page ${virtualPageIndex} not in memory.`;
            return;
        }
        
        const physicalAddress = (pageEntry.physicalIndex * systemConfig.pageSize) + offset;
        conversionResult.innerHTML = `
            <p>Virtual Address: ${addressValue}</p>
            <p>Virtual Page: ${virtualPageIndex}, Offset: ${offset}</p>
            <p>Physical Page: ${pageEntry.physicalIndex}</p>
            <p>Physical Address: ${physicalAddress}</p>
        `;
    } else {
        if (addressValue >= systemConfig.physicalSpace) {
            conversionError.textContent = `Physical address ${addressValue} exceeds physical space (${systemConfig.physicalSpace}).`;
            return;
        }
        
        const physicalPageIndex = Math.floor(addressValue / systemConfig.pageSize);
        const offset = addressValue % systemConfig.pageSize;
        const pageEntry = pageTable.find(entry => entry.present && entry.physicalIndex === physicalPageIndex);
        
        if (!pageEntry) {
            conversionError.textContent = `No virtual page mapped to physical page ${physicalPageIndex}.`;
            return;
        }
        
        const virtualAddress = (pageEntry.virtualIndex * systemConfig.pageSize) + offset;
        conversionResult.innerHTML = `
            <p>Physical Address: ${addressValue}</p>
            <p>Physical Page: ${physicalPageIndex}, Offset: ${offset}</p>
            <p>Virtual Page: ${pageEntry.virtualIndex}</p>
            <p>Virtual Address: ${virtualAddress}</p>
        `;
    }
}

// Helper functions
function findDivisor(n) {
    console.log('findDivisor called for', n);
    for (let i = n; i >= 1; i--) {
        if (n % i === 0) return i;
    }
    return 1;
}