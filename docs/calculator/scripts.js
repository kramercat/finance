let chartInstance;

// Function to initialize the page and set default message
function bodyOnLoad() {
    document.getElementById('info').innerHTML = "Everything loaded and we are ready for lift off. 🚀";
    inUpdate();
}

// Function to log messages to the console
function log(input) {
    console.log(input);
}

// Function to validate and limit number inputs
function checkNumber(number) {
    if (isNaN(number)) return 'Invalid number';
    number = Number(number);
    return number > 1e15 ? 1e15 : number;
}

// Function to format numbers with commas
function formatNumberWithCommas(number) {
    return checkNumber(number).toLocaleString('en-US');
}

// Function to format numbers as dollars with specified decimals
function formatDollar(number, decimals = 2) {
    return '$' + checkNumber(number).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Function to format numbers as dollars without decimals
function formatDollarShort(number) {
    return number < 1e9 ? formatDollar(number, 0) : formatDollarAbbreviated(number);
}

// Function to format numbers with abbreviations (K, M, B, T)
function formatAbbreviatedNumber(number) {
    number = checkNumber(number);
    if (number >= 1e12) return (number / 1e12).toFixed(number >= 1e13 ? 0 : 1) + 'T';
    if (number >= 1e9) return (number / 1e9).toFixed(number >= 1e10 ? 0 : 1) + 'B';
    if (number >= 1e6) return (number / 1e6).toFixed(number >= 1e7 ? 0 : 1) + 'M';
    if (number >= 1e3) return (number / 1e3).toFixed(number >= 1e4 ? 0 : 1) + 'K';
    return number;
}

// Function to format numbers as abbreviated dollars
function formatDollarAbbreviated(number) {
    return '$' + formatAbbreviatedNumber(number);
}

// Function to parse numbers from strings
function parseNumberFromString(string) {
    // Ensure that 'string' is a string before using .replace()
    const cleanedString = String(string).replace(/,/g, '').trim();  // Convert to string, then remove commas
    const parsed = parseFloat(cleanedString);
    return isNaN(parsed) ? 0 : parsed; // Returns 0 if invalid number
}

// Function to update the inputs and results based on user input
function inUpdate() {
    log("Calculating...");

    const inputs = ['input-401kBalance', 'input-401kContribution', 'input-401kReturn', 'input-401kYears'].map(id => document.getElementById(id).value);

    // Limit max balance to 10 million
    inputs[0] = Math.min(parseNumberFromString(inputs[0]), 1e7);

    // Limit max contribution to 1 million
    inputs[1] = Math.min(parseNumberFromString(inputs[1]), 1e6);

    // Limit max return to 50%
    inputs[2] = Math.min(parseNumberFromString(inputs[2]), 30);

    // Limit max years to 60
    inputs[3] = Math.min(parseNumberFromString(inputs[3]), 60);

    // Limit all values to positive numbers
    inputs.forEach((input, i) => {
        inputs[i] = Math.abs(parseNumberFromString(input));
    });

    log(`401K Inputs: $${inputs[0]} / $${inputs[1]} / ${inputs[2]}% / ${inputs[3]} years`);

    const [balance, contribution, rate, years] = inputs.map(parseNumberFromString);

    ['input-401kBalance', 'input-401kContribution', 'input-401kReturn', 'input-401kYears'].forEach((id, i) => {
        document.getElementById(id).value = formatNumberWithCommas([balance, contribution, rate, years][i]);
    });

    updateGrowthTableAndChart(balance, contribution, rate, years);
}

// Function to set right-align class to table cells
function setRightAlign(cells) {
    cells.forEach(cell => cell.classList.add('right-align'));
}

// Function to update the growth table and chart based on inputs
function updateGrowthTableAndChart(balanceStarting, contribution, rate, years) {
    // Clear existing table and chart
    const growthTableBody = document.getElementById('growthTable').getElementsByTagName('tbody')[0];
    growthTableBody.innerHTML = ''; // Clear existing rows

    // Clear existing chart
    const labels = [];
    const data = {
        balanceStarting: [],
        balancePrevious: [],
        contributionTotal: [],
        contributionNew: [],
        returnPrevious: [],
        returnNew: [],
        balanceEnding: []
    };

    // Initialize variables
    let currentYear = new Date().getFullYear();
    let balancePrevious = balanceStarting;
    let balanceEnding = balanceStarting;
    let contributionTotal = 0;
    let returnTotal = 0;

    // Loop through each year
    for (let year = 0; year < years; year++) {
        // Add row to table
        const row = growthTableBody.insertRow();
        const cells = [
            row.insertCell(0),
            row.insertCell(1),
            row.insertCell(2),
            row.insertCell(3),
            row.insertCell(4),
            row.insertCell(5),
            row.insertCell(6),
            row.insertCell(7),
            row.insertCell(8)
        ];
        // Set right-align class to cells
        setRightAlign(cells);

        // Add year to labels
        labels.push(currentYear + year);
        cells[0].innerText = year + 1;
        cells[1].innerText = currentYear + year;

        // Balance calculations
        balancePrevious = balanceEnding;
        data.balanceStarting.push(balanceStarting.toFixed(2));
        data.balancePrevious.push(balancePrevious.toFixed(2));
        cells[2].innerText = formatDollarShort(balancePrevious.toFixed(2));

        // Existing contribution
        data.contributionTotal.push(contributionTotal.toFixed(2));
        cells[3].innerText = formatDollarShort(contributionTotal.toFixed(2));

        // New contribution calculations
        contributionTotal += contribution;
        data.contributionNew.push(contribution.toFixed(2));
        cells[4].innerText = "+" + formatDollarShort(contribution.toFixed(2));
        cells[4].classList.add('green');

        // Return calculations
        data.returnPrevious.push(returnTotal.toFixed(2));
        const returnNew = (balancePrevious + contribution) * (rate / 100); // Add contribution first before calculating return
        data.returnNew.push(returnNew.toFixed(2));
        cells[5].innerText = formatDollarShort(returnTotal.toFixed(2));
        returnTotal += returnNew;
        cells[6].innerText = "+" + formatDollarShort(returnNew.toFixed(2));
        cells[6].classList.add('green');

        // Ending balance calculations
        balanceEnding += returnNew + contribution;
        data.balanceEnding.push(balanceEnding.toFixed(2));
        const totalChange = balanceEnding - balancePrevious;
        cells[7].innerText = formatDollarShort(balanceEnding.toFixed(2));
        cells[8].innerText = "+" + formatDollarShort(totalChange.toFixed(2));
        cells[8].classList.add('green');

        // Log calculations
        log(`Year ${year}: ${formatDollarAbbreviated(balanceStarting)} + ${formatDollarAbbreviated(contribution)} + ${formatDollarAbbreviated(returnNew)} = ${formatDollarAbbreviated(balanceEnding)}`);

    }

    // Add chart to page
    const ctx = document.getElementById('growthChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    Chart.register(ChartDataLabels);
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Balance Starting', data: data.balanceStarting, backgroundColor: 'rgba(75, 192, 192, 0.2)', borderColor: 'rgba(75, 192, 192, 1)', borderWidth: 1 },
                { label: 'Contributions (Existing)', data: data.contributionTotal, backgroundColor: 'rgba(54, 162, 235, 0.2)', borderColor: 'rgba(54, 162, 235, 1)', borderWidth: 1 },
                { label: 'Contributions (New)', data: data.contributionNew, backgroundColor: 'rgba(54, 206, 235, 0.2)', borderColor: 'rgba(54, 206, 235, 1)', borderWidth: 1 },
                { label: 'Returns (Existing)', data: data.returnPrevious, backgroundColor: 'rgba(255, 206, 86, 0.2)', borderColor: 'rgba(255, 206, 86, 1)', borderWidth: 1 },
                { label: 'Returns (New)', data: data.returnNew, backgroundColor: 'rgba(255, 140, 86, 0.2)', borderColor: 'rgba(255, 140, 86, 1)', borderWidth: 1 },
                {
                    label: 'Balance Ending',
                    data: data.balanceEnding,
                    backgroundColor: 'rgba(104, 192, 0, 0.2)',
                    borderColor: 'rgba(104, 192, 0, 1)',
                    borderWidth: 1,
                    type: 'line',
                    datalabels: {
                        display: true,
                        align: 'end',
                        anchor: 'end',
                        formatter: value => formatDollarAbbreviated(value),
                        color: 'rgba(104, 192, 0, 1)',
                        font: { family: 'Roboto Condensed', size: 10, weight: 'bold' }
                    }
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    stacked: true,
                    title: { display: true, text: 'Year' },
                    ticks: { callback: (value, index) => index + 1 },
                    grid: {
                        display: true,
                        drawOnChartArea: true,
                        drawTicks: true,
                        tickMarkLength: 10,
                        color: context => context.tick && context.tick.value % 5 === 0 ? 'rgba(0, 0, 0, 1)' : 'rgba(0, 0, 0, 0.1)',
                        lineWidth: context => context.tick && context.tick.value % 5 === 0 ? 1.1 : 1
                    }
                },
                y: {
                    stacked: true,
                    title: { display: true, text: 'Amount ($)' },
                    beginAtZero: true,
                    max: 100000 * Math.round((balanceEnding * 1.2) / 100000, 4)
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: context => {
                            const label = context.dataset.label || '';
                            const value = context.raw;
                            const formattedValue = formatDollarShort(value);
                            const maxLength = 35;
                            const labelLength = label.length + formattedValue.length;
                            const paddingLength = maxLength - labelLength > 0 ? maxLength - labelLength : 0;
                            const paddedValue = ' '.repeat(paddingLength) + formattedValue;
                            return label + ': ' + paddedValue;
                        }
                    },
                    titleFont: { family: 'Courier New', weight: 'normal', size: 12 },
                    bodyFont: { family: 'Courier New', weight: 'normal', size: 12 },
                    footerFont: { family: 'Courier New', weight: 'normal', size: 12 },
                    itemSort: (a, b) => b.datasetIndex - a.datasetIndex
                },
                datalabels: { display: false }
            },
            hover: { mode: 'index', intersect: false }
        }
    });
}

// Add event listeners to input fields to trigger updates on change
['input-401kBalance', 'input-401kContribution', 'input-401kReturn', 'input-401kYears'].forEach(id => {
    document.getElementById(id).addEventListener('input', inUpdate);
});
