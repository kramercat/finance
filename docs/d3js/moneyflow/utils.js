const nodeFontSize = "15px"
const nodeFontHeight = 15;
const stripeWidth = 1
const stripeSpacing = 10
const stripeColor = "#f33"

// Function to wrap text into multiple lines based on maxWidth
function wrapText(textElement, text, maxWidth, font = nodeFontSize) {
  const words = text.split(' ');
  let currentLine = '';
  const lines = [];

  // Measure text width for wrapping
  const measureWidth = (line) => textElement.style("font", font).text(line).node().getBBox().width;

  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (measureWidth(testLine) > maxWidth || word.startsWith("$")) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  lines.push(currentLine);  // Add the last line

  // Set the text content with wrapping
  textElement.text(null);
  const numLines = lines.length;
  lines.forEach((line, i) => {
    textElement.append("tspan")
      .attr("x", textElement.attr("x"))
      .attr("y", parseFloat(textElement.attr("y")) + (i - numLines / 2 + 0.5) * nodeFontHeight)
      .style("font", font)
      .text(line);
  });
}

// Function to create striped pattern
function createStripedPattern(defs, id, fillColor) {
  const pattern = defs.append("pattern")
    .attr("id", id)
    .attr("patternUnits", "userSpaceOnUse")
    .attr("width", stripeWidth)
    .attr("height", stripeSpacing)
    .attr("patternTransform", "rotate(45)");

  pattern.append("rect")
    .attr("width", stripeWidth)
    .attr("height", stripeSpacing)
    .attr("fill", fillColor);

  pattern.append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", stripeWidth)
    .attr("y2", 0)
    .attr("stroke", stripeColor)
    .attr("stroke-width", stripeWidth);
}

// Function to convert number to dollar format
function numberToDollar(num) {
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// Function to calculate taxes based on income and tax brackets
function calculateTaxes(income) {
  const brackets = [
    { rate: 0.10, threshold: 11600 },
    { rate: 0.12, threshold: 47150 },
    { rate: 0.22, threshold: 100525 },
    { rate: 0.24, threshold: 191950 },
    { rate: 0.32, threshold: 243725 },
    { rate: 0.35, threshold: 609350 },
    { rate: 0.37, threshold: Infinity }
  ];

  let taxes = 0;
  let previousThreshold = 0;

  for (const bracket of brackets) {
    if (income > bracket.threshold) {
      taxes += (bracket.threshold - previousThreshold) * bracket.rate;
      previousThreshold = bracket.threshold;
    } else {
      taxes += (income - previousThreshold) * bracket.rate;
      break;
    }
  }

  return taxes;
}

// Function to update display values
function updateDisplayValues() {
  const fields = [
    'income-amount',
    'tax-deductions',
    '401k-contributions-pretax',
    '401k-contributions-employer',
    '401k-contributions-posttax',
    'ira-traditional'
  ];

  fields.forEach(field => {
    const value = +document.getElementById(field).value;
    document.getElementById(`${field}-display`).innerText = value.toLocaleString();
    document.getElementById(`${field}-input`).value = value;
  });
}

// Export the functions
export { updateDisplayValues, wrapText, createStripedPattern, numberToDollar, calculateTaxes };
