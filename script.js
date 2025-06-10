document.addEventListener("DOMContentLoaded", function () {
  let chart;
  let points = [];
  let evaluationPoint = null;
  let modelFunc = () => NaN;

  const METHOD_INFO = {
    regression:
      "<b>Regresi Linier:</b> Digunakan untuk menemukan 'garis tren' terbaik yang mewakili hubungan antara variabel dalam sebuah set data. Sangat baik untuk memodelkan data yang memiliki noise atau ketidakpastian dan untuk membuat prediksi.",
    polynomial:
      "<b>Interpolasi Polinom:</b> Membuat kurva mulus yang melewati setiap titik data secara presisi. Berguna dalam grafik komputer atau saat data diketahui sangat akurat. Hati-hati dengan derajat yang terlalu tinggi, karena dapat menyebabkan osilasi liar (Runge's phenomenon).",
    linear:
      "<b>Interpolasi Linier:</b> Bentuk paling sederhana dari interpolasi polinom (derajat 1). Ia hanya menghubungkan dua titik data dengan garis lurus. Cepat dan sederhana, namun kurang akurat untuk data yang membentuk kurva.",
    quadratic:
      "<b>Interpolasi Kuadrat:</b> Menggunakan polinom derajat 2 untuk membuat parabola yang melewati tepat tiga titik data. Memberikan kelengkungan yang lebih baik daripada interpolasi linier.",
    lagrange:
      "<b>Interpolasi Lagrange:</b> Cara lain untuk menemukan polinom unik yang melewati semua titik data. Metode ini membangun kurva dengan menjumlahkan serangkaian polinom basis, dan seringkali lebih intuitif untuk dipelajari secara teoretis.",
  };

  const formatNumber = (num, places = 4) => parseFloat(num.toFixed(places));
  const computeLinearRegression = (pts) => {
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;
    const n = pts.length;
    pts.forEach((p) => {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumX2 += p.x * p.x;
    });
    const denominator = n * sumX2 - sumX * sumX;
    if (Math.abs(denominator) < 1e-9) return null;
    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept, sums: { n, sumX, sumY, sumXY, sumX2 } };
  };
  const computePolynomialCoefficients = (pts, deg) => {
    if (pts.length < deg + 1) return null;
    try {
      const vandermonde = [],
        b = [];
      pts.forEach((point) => {
        const row = [];
        for (let j = 0; j <= deg; j++) row.push(Math.pow(point.x, j));
        vandermonde.push(row);
        b.push(point.y);
      });
      const coeffs = math.lusolve(vandermonde, b).map((c) => c[0]);
      return { coeffs, matrix: vandermonde, b };
    } catch (error) {
      return null;
    }
  };
  const evaluatePolynomial = (coeffs, x) =>
    !coeffs ? NaN : coeffs.reduce((sum, c, i) => sum + c * Math.pow(x, i), 0);
  const evaluateLagrange = (pts, x) =>
    pts.reduce(
      (sum, p, i) =>
        sum +
        pts.reduce(
          (prod, q, j) => (i === j ? prod : prod * ((x - q.x) / (p.x - q.x))),
          p.y
        ),
      0
    );
  const calculateMSE = (allPts, func) => {
    if (allPts.length === 0 || isNaN(func(0))) return 0;
    const sumOfSquares = allPts.reduce(
      (sum, p) => sum + Math.pow(p.y - func(p.x), 2),
      0
    );
    return sumOfSquares / allPts.length;
  };

  const formatRegressionEquation = (s, i) =>
    `<div class="font-mono text-lg">y = ${formatNumber(s)}x ${
      i < 0 ? "-" : "+"
    } ${formatNumber(Math.abs(i))}</div>`;

  // --- NEW: MORE DETAILED REGRESSION STEPS ---
  const formatRegressionSteps = (slope, intercept, sums) => {
    const { n, sumX, sumY, sumXY, sumX2 } = sums;
    const h4Classes =
      "text-lg font-semibold mt-4 border-b border-gray-200 pb-2 mb-2";
    const h5Classes = "mt-3 font-semibold text-sm";
    const pClasses = "text-sm ml-4";
    const codeClasses =
      "font-mono bg-gray-100 p-2 rounded inline-block text-sm";

    const n_sumXY = n * sumXY;
    const sumX_sumY = sumX * sumY;
    const slopeNumerator = n_sumXY - sumX_sumY;
    const n_sumX2 = n * sumX2;
    const sumX_squared = Math.pow(sumX, 2);
    const slopeDenominator = n_sumX2 - sumX_squared;
    const m_sumX = slope * sumX;
    const interceptNumerator = sumY - m_sumX;

    let steps = `<h4 class="${h4Classes}">1. Perhitungan Total Dasar</h4>`;
    steps += `<p>Menggunakan metode least squares, kita hitung total berikut dari data:</p>`;
    steps += `<div class="mt-2 ${codeClasses}">n = ${n}<br>Σx = ${formatNumber(
      sumX
    )}<br>Σy = ${formatNumber(sumY)}<br>Σxy = ${formatNumber(
      sumXY
    )}<br>Σx² = ${formatNumber(sumX2)}</div>`;

    steps += `<h4 class="${h4Classes}">2. Perhitungan Slope (m)</h4>`;
    steps += `<p>Formula: <code class="font-mono text-xs">(nΣxy - ΣxΣy) / (nΣx² - (Σx)²)</code></p>`;

    steps += `<p class="${h5Classes}">Langkah 2a: Hitung Pembilang (bagian atas)</p>`;
    steps += `<p class="${pClasses}">n * Σxy = ${n} * ${formatNumber(
      sumXY
    )} = ${formatNumber(n_sumXY)}</p>`;
    steps += `<p class="${pClasses}">Σx * Σy = ${formatNumber(
      sumX
    )} * ${formatNumber(sumY)} = ${formatNumber(sumX_sumY)}</p>`;
    steps += `<p class="${pClasses}">Hasil Pembilang = ${formatNumber(
      n_sumXY
    )} - ${formatNumber(sumX_sumY)} = <b>${formatNumber(
      slopeNumerator
    )}</b></p>`;

    steps += `<p class="${h5Classes}">Langkah 2b: Hitung Penyebut (bagian bawah)</p>`;
    steps += `<p class="${pClasses}">n * Σx² = ${n} * ${formatNumber(
      sumX2
    )} = ${formatNumber(n_sumX2)}</p>`;
    steps += `<p class="${pClasses}">(Σx)² = (${formatNumber(
      sumX
    )})² = ${formatNumber(sumX_squared)}</p>`;
    steps += `<p class="${pClasses}">Hasil Penyebut = ${formatNumber(
      n_sumX2
    )} - ${formatNumber(sumX_squared)} = <b>${formatNumber(
      slopeDenominator
    )}</b></p>`;

    steps += `<p class="${h5Classes}">Langkah 2c: Hitung Final Slope</p>`;
    steps += `<p class="${pClasses}">m = Pembilang / Penyebut = ${formatNumber(
      slopeNumerator
    )} / ${formatNumber(slopeDenominator)}</p>`;
    steps += `<p class="mt-1"><b>m ≈ ${formatNumber(slope, 6)}</b></p>`;

    steps += `<h4 class="${h4Classes}">3. Perhitungan Intercept (c)</h4>`;
    steps += `<p>Formula: <code class="font-mono text-xs">(Σy - mΣx) / n</code></p>`;
    steps += `<p class="${h5Classes}">Langkah 3a: Hitung Pembilang</p>`;
    steps += `<p class="${pClasses}">m * Σx = ${formatNumber(
      slope,
      4
    )} * ${formatNumber(sumX)} = ${formatNumber(m_sumX)}</p>`;
    steps += `<p class="${pClasses}">Hasil Pembilang = ${formatNumber(
      sumY
    )} - ${formatNumber(m_sumX)} = <b>${formatNumber(
      interceptNumerator
    )}</b></p>`;
    steps += `<p class="${h5Classes}">Langkah 3b: Hitung Final Intercept</p>`;
    steps += `<p class="${pClasses}">c = Pembilang / n = ${formatNumber(
      interceptNumerator
    )} / ${n}</p>`;
    steps += `<p class="mt-1"><b>c ≈ ${formatNumber(intercept, 6)}</b></p>`;

    return steps;
  };
  const formatMatrix = (matrix, b, coeffs) => {
    const matrixContainerClasses =
      "font-mono p-3 border border-gray-200 rounded-md bg-gray-100 whitespace-pre text-xs overflow-x-auto";
    let str =
      "<p>Untuk menemukan koefisien polinom, kita menyusun sebuah sistem persamaan linier dalam bentuk matriks <b>Ax = b</b>.</p>";
    str +=
      "<p class='mt-2'>Matriks <b>A</b> adalah matriks Vandermonde, vektor <b>b</b> adalah nilai y, dan vektor <b>x</b> adalah koefisien (a₀, a₁, ...) yang ingin kita cari.</p>";
    str += `<div class="mt-4 ${matrixContainerClasses}">Sistem Persamaan Linier: Ax = b\n\nMatriks A (Vandermonde):\n`;
    matrix.forEach((row) => {
      str += `[ ${row
        .map((val) => formatNumber(val).toString().padEnd(7))
        .join(" ")} ]\n`;
    });
    str += "\nVektor b (Nilai y):\n";
    b.forEach((val) => {
      str += `[ ${formatNumber(val)} ]\n`;
    });
    str += "</div>";
    str +=
      "<p class='mt-4'>Aplikasi ini menggunakan metode numerik (dekomposisi LU) untuk menyelesaikan sistem ini secara efisien. Hasil dari penyelesaian `x = A⁻¹b` adalah:</p>";
    str += `<div class="mt-2 ${matrixContainerClasses}">Koefisien Polinom (x):\n`;
    coeffs.forEach((val, i) => {
      str += `a${i} = ${formatNumber(val, 6)}\n`;
    });
    str += `</div>`;
    return str;
  };
  const formatPolynomialEquation = (coeffs) => {
    if (!coeffs || coeffs.length === 0) return "P(x) = 0";
    let equation = "";
    let isFirstTerm = true;
    coeffs.forEach((c, i) => {
      if (Math.abs(c) < 1e-9) return;
      const coeffVal = Math.abs(formatNumber(c));
      const sign = c < 0 ? " - " : " + ";
      let term = "";
      if (i === 0) {
        term = `${formatNumber(c)}`;
      } else {
        const xTerm = i === 1 ? "x" : `x<sup>${i}</sup>`;
        term =
          coeffVal === 1 ? `${sign}${xTerm}` : `${sign}${coeffVal} ${xTerm}`;
      }
      if (isFirstTerm) {
        term =
          c < 0
            ? i === 0
              ? `${formatNumber(c)}`
              : `- ${coeffVal === 1 ? `x` : `${coeffVal} x`}`
            : term;
        isFirstTerm = false;
      }
      equation += term;
    });
    return `<div class="font-mono text-lg">P(x) = ${equation
      .trim()
      .replace(/^\+\s/, "")}</div>`;
  };
  const formatLagrangeSteps = (pts) => {
    const h4Classes =
      "text-lg font-semibold mt-4 border-b border-gray-200 pb-2 mb-2";
    const codeClasses =
      "bg-indigo-50 text-indigo-800 px-2 py-1 rounded text-sm font-mono";
    let steps = `<h4 class="${h4Classes}">1. Konstruksi Polinom Basis Lagrange (Lᵢ(x))</h4>`;
    steps += `<p>Setiap basis polinom Lᵢ(x) dihitung menggunakan rumus: <code class="${codeClasses}">Lᵢ(x) = Π (x - xⱼ) / (xᵢ - xⱼ)</code> untuk j ≠ i</p>`;
    pts.forEach((p, i) => {
      steps += `<p class="mt-4 text-sm"><b>Konstruksi untuk L<sub>${i}</sub>(x)</b> (menggunakan titik P${i} = (${p.x}, ${p.y})):</p>`;
      let numerator = pts
        .filter((_, j) => i !== j)
        .map((pj) => `(x - ${pj.x})`)
        .join("");
      let denominatorTerms = pts
        .filter((_, j) => i !== j)
        .map((pj) => `(${p.x} - ${pj.x})`);
      let denominatorValue = pts
        .filter((_, j) => i !== j)
        .reduce((prod, pj) => prod * (p.x - pj.x), 1);
      steps += `<p class="text-xs ml-4">L<sub>${i}</sub>(x) = ${numerator} / [${denominatorTerms.join(
        ""
      )}]`;
      steps += `<p class="text-xs ml-4">L<sub>${i}</sub>(x) = ${numerator} / ${formatNumber(
        denominatorValue
      )}</p>`;
    });
    steps += `<h4 class="${h4Classes}">2. Kombinasi Akhir Polinom P(x)</h4>`;
    steps +=
      "<p>Polinom akhir adalah penjumlahan berbobot: P(x) = Σ yᵢ ⋅ Lᵢ(x)</p>";
    let finalEquation =
      "P(x) = " + pts.map((p, i) => `${p.y} ⋅ L<sub>${i}</sub>(x)`).join(" + ");
    steps += `<p class="mt-2"><code class="${codeClasses}">${finalEquation}</code></p>`;
    return steps;
  };

  const addPoint = (x, y) => {
    points.push({ x: formatNumber(x, 2), y: formatNumber(y, 2) });
    points.sort((a, b) => a.x - b.x);
    updateUI();
  };

  function renderPointsList() {
    const listDiv = document.getElementById("pointsList");
    listDiv.innerHTML = "";
    if (points.length === 0) {
      listDiv.innerHTML = '<p class="text-gray-500 italic">Belum ada data.</p>';
      return;
    }
    points.forEach((p, index) => {
      const pointRow = document.createElement("div");
      pointRow.className = "flex items-center justify-between space-x-2";
      pointRow.innerHTML = `
        <span>P${index}:</span>
        <input type="number" value="${p.x}" data-index="${index}" data-axis="x" class="table-input" step="0.1">
        <input type="number" value="${p.y}" data-index="${index}" data-axis="y" class="table-input" step="0.1">
        <button data-index="${index}" class="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button>
      `;
      listDiv.appendChild(pointRow);
    });
    listDiv.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const index = parseInt(e.target.dataset.index),
          axis = e.target.dataset.axis,
          value = parseFloat(e.target.value);
        if (!isNaN(value) && points[index]) {
          points[index][axis] = value;
          points.sort((a, b) => a.x - b.x);
          updateUI();
        }
      });
    });
    listDiv.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", (e) => {
        points.splice(parseInt(e.currentTarget.dataset.index), 1);
        updateUI();
      });
    });
  }

  function updateInputRestrictions() {
    const method = document.getElementById("fittingMethod").value,
      infoDiv = document.getElementById("inputInfo");
    const addBtn = document.getElementById("addPointBtn"),
      newXInput = document.getElementById("newX"),
      newYInput = document.getElementById("newY");
    let infoText = "",
      canAdd = true;
    switch (method) {
      case "regression":
        infoText = "Butuh min. 2 titik. Lebih banyak lebih baik.";
        break;
      case "linear":
        infoText = "Butuh tepat 2 titik.";
        if (points.length >= 2) canAdd = false;
        break;
      case "quadratic":
        infoText = "Butuh tepat 3 titik.";
        if (points.length >= 3) canAdd = false;
        break;
      case "polynomial":
        const degree = parseInt(document.getElementById("degree").value);
        infoText = `Derajat ${degree} butuh min. ${degree + 1} titik.`;
        break;
      case "lagrange":
        infoText = "Butuh min. 2 titik.";
        break;
    }
    infoDiv.textContent = infoText;
    addBtn.disabled = !canAdd;
    newXInput.disabled = !canAdd;
    newYInput.disabled = !canAdd;
    addBtn.classList.toggle("opacity-50", !canAdd);
    addBtn.classList.toggle("cursor-not-allowed", !canAdd);
    newXInput.classList.toggle("bg-gray-200", !canAdd);
    newYInput.classList.toggle("bg-gray-200", !canAdd);
  }

  function updateUI() {
    const method = document.getElementById("fittingMethod").value;
    document.getElementById("methodInfoText").innerHTML = METHOD_INFO[method];
    document.getElementById("degreeControl").style.display =
      method === "polynomial" ? "block" : "none";
    updateInputRestrictions();
    renderPointsList();
    modelFunc = () => NaN;
    evaluationPoint = null;
    document.getElementById("evalOutput").textContent = "";

    let equationStr =
      '<div class="font-mono text-lg text-gray-500 italic">...</div>';
    let stepsStr =
      '<p class="text-gray-500 italic">Langkah perhitungan akan muncul di sini.</p>';
    let equationInterpretation = "";
    let mseInterpretation = "";

    if (points.length >= 2) {
      let resultData = {};
      if (method === "regression") {
        const result = computeLinearRegression(points);
        if (result) {
          resultData = { ...result };
          modelFunc = (x) => resultData.slope * x + resultData.intercept;
          equationStr = formatRegressionEquation(
            resultData.slope,
            resultData.intercept
          );
          stepsStr = formatRegressionSteps(
            resultData.slope,
            resultData.intercept,
            resultData.sums
          );
          equationInterpretation = `<p class="text-sm text-gray-600 mt-2">Ini berarti, untuk setiap kenaikan 1 unit pada sumbu X, nilai Y diperkirakan akan <b>${
            resultData.slope >= 0 ? "naik" : "turun"
          }</b> sebesar <b>${formatNumber(
            Math.abs(resultData.slope)
          )}</b> unit.</p>`;
        }
      } else if (method === "lagrange") {
        modelFunc = (x) => evaluateLagrange(points, x);
        equationStr = `<div class="font-mono text-lg text-gray-600">Lihat langkah perhitungan di bawah.</div>`;
        stepsStr = formatLagrangeSteps(points);
        equationInterpretation = `<p class="text-sm text-gray-600 mt-2">Ini adalah polinom unik berderajat <b>${
          points.length - 1
        }</b> yang melewati semua titik data secara presisi.</p>`;
      } else {
        let degree;
        if (method === "linear") degree = 1;
        else if (method === "quadratic") degree = 2;
        else
          degree = Math.min(
            parseInt(document.getElementById("degree").value),
            points.length - 1
          );
        if (points.length >= degree + 1) {
          const pointsToUse =
            method === "polynomial" ? points : points.slice(0, degree + 1);
          const result = computePolynomialCoefficients(pointsToUse, degree);
          if (result) {
            resultData = { ...result, degree: degree };
            modelFunc = (x) => evaluatePolynomial(resultData.coeffs, x);
            equationStr = formatPolynomialEquation(resultData.coeffs);
            stepsStr = formatMatrix(
              resultData.matrix,
              resultData.b,
              resultData.coeffs
            );
            equationInterpretation = `<p class="text-sm text-gray-600 mt-2">Ini adalah polinom unik berderajat <b>${resultData.degree}</b> yang melewati semua titik data yang dipilih secara presisi.</p>`;
          }
        }
      }
    }

    const finalMse = calculateMSE(points, modelFunc);
    if (points.length > 0 && !isNaN(finalMse)) {
      if (finalMse < 1e-9) {
        mseInterpretation = `<p class="text-sm text-gray-600 mt-2">Nilai MSE nol (atau sangat kecil) menandakan <b>perfect fit</b>. Model melewati setiap titik data dengan sempurna, sesuai harapan untuk metode interpolasi.</p>`;
      } else {
        mseInterpretation = `<p class="text-sm text-gray-600 mt-2">MSE mengukur rata-rata kuadrat jarak dari setiap titik data ke garis/kurva model. <b>Nilai yang lebih rendah berarti model lebih akurat</b>. Ini adalah galat yang wajar untuk model regresi.</p>`;
      }
    }

    document.getElementById("modelEquation").innerHTML =
      equationStr + equationInterpretation;
    document.getElementById("calculationSteps").innerHTML = stepsStr;
    document.getElementById("fittingError").innerHTML =
      `<div class="font-mono text-lg">${formatNumber(finalMse, 8)}</div>` +
      mseInterpretation;
    updateChart();
  }

  function updateChart() {
    const xVals = points.map((p) => p.x),
      yVals = points.map((p) => p.y);
    const minX = xVals.length ? Math.min(...xVals) : 0,
      maxX = xVals.length ? Math.max(...xVals) : 10;
    const minY = yVals.length ? Math.min(...yVals) : 0,
      maxY = yVals.length ? Math.max(...yVals) : 10;
    const xRange = Math.max(1, maxX - minX),
      yRange = Math.max(1, maxY - minY);
    chart.options.scales.x.min = minX - xRange * 0.1;
    chart.options.scales.x.max = maxX + xRange * 0.1;
    chart.options.scales.y.min = minY - yRange * 0.1;
    chart.options.scales.y.max = maxY + yRange * 0.1;
    chart.data.datasets[0].data = points;
    chart.data.datasets[2].data = evaluationPoint ? [evaluationPoint] : [];
    if (points.length >= 2 && !isNaN(modelFunc(points[0].x))) {
      const curvePoints = [],
        plotMin = chart.options.scales.x.min,
        plotMax = chart.options.scales.x.max;
      for (let x = plotMin; x <= plotMax; x += (plotMax - plotMin) / 200)
        curvePoints.push({ x, y: modelFunc(x) });
      chart.data.datasets[1].data = curvePoints;
    } else {
      chart.data.datasets[1].data = [];
    }
    chart.update();
  }

  function initChart() {
    const ctx = document.getElementById("chart").getContext("2d");
    chart = new Chart(ctx, {
      type: "scatter",
      data: {
        datasets: [
          {
            label: "Titik Data",
            data: [],
            backgroundColor: "rgb(239, 68, 68)",
            pointRadius: 6,
            order: 2,
          },
          {
            label: "Kurva Model",
            data: [],
            type: "line",
            borderColor: "rgb(59, 130, 246)",
            borderWidth: 2.5,
            pointRadius: 0,
            fill: false,
            tension: 0.1,
            order: 1,
          },
          {
            label: "Titik Evaluasi",
            data: [],
            backgroundColor: "rgb(16, 185, 129)",
            pointRadius: 8,
            pointStyle: "triangle",
            order: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (
            document.getElementById("addPointBtn").disabled ||
            elements.length > 0
          )
            return;
          const pos = Chart.helpers.getRelativePosition(event, chart);
          addPoint(
            chart.scales.x.getValueForPixel(pos.x),
            chart.scales.y.getValueForPixel(pos.y)
          );
        },
        plugins: {
          dragData: {
            round: 2,
            showTooltip: true,
            onDragEnd: function (e, datasetIndex, index, value) {
              if (datasetIndex === 0) {
                points[index] = value;
                points.sort((a, b) => a.x - b.x);
                updateUI();
              }
            },
          },
        },
      },
    });
  }

  document.getElementById("fittingMethod").addEventListener("change", updateUI);
  document.getElementById("degree").addEventListener("input", function () {
    document.getElementById("degreeValue").textContent = this.value;
    updateUI();
  });
  document.getElementById("csvInput").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      const newPoints = [];
      e.target.result.split("\n").forEach((row) => {
        const cols = row.split(",");
        if (cols.length >= 2) {
          const x = parseFloat(cols[0]),
            y = parseFloat(cols[1]);
          if (!isNaN(x) && !isNaN(y)) newPoints.push({ x, y });
        }
      });
      if (newPoints.length > 0) {
        points = newPoints;
        points.sort((a, b) => a.x - b.x);
        updateUI();
      } else {
        alert(
          "Gagal memuat data dari CSV. Pastikan formatnya adalah x,y per baris."
        );
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  });
  document.getElementById("evalBtn").addEventListener("click", function () {
    const x = parseFloat(document.getElementById("evalX").value),
      evalOutput = document.getElementById("evalOutput");
    if (isNaN(x)) {
      evalOutput.innerHTML =
        '<span class="text-red-500">Masukkan nilai x.</span>';
      return;
    }
    if (isNaN(modelFunc(x))) {
      evalOutput.innerHTML =
        '<span class="text-red-500">Model tidak valid.</span>';
      return;
    }
    evaluationPoint = { x, y: modelFunc(x) };
    evalOutput.innerHTML = `P(${x}) ≈ ${formatNumber(evaluationPoint.y, 4)}`;
    updateChart();
  });
  document.getElementById("addPointBtn").addEventListener("click", () => {
    const x = parseFloat(document.getElementById("newX").value),
      y = parseFloat(document.getElementById("newY").value);
    if (!isNaN(x) && !isNaN(y)) {
      addPoint(x, y);
      document.getElementById("newX").value = "";
      document.getElementById("newY").value = "";
    } else {
      alert("Masukkan nilai x dan y yang valid");
    }
  });
  document.getElementById("clearBtn").addEventListener("click", () => {
    points = [];
    updateUI();
  });

  initChart();
  updateUI();
});
