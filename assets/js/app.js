const fileInput = document.getElementById('fileInput');
    const ratioSelect = document.getElementById('ratioSelect');
    const colsInput = document.getElementById('colsInput');
    const rowsInput = document.getElementById('rowsInput');
    const lineWidthInput = document.getElementById('lineWidthInput');
    const lineWidthText = document.getElementById('lineWidthText');
    const removeBgChk = document.getElementById('removeBgChk');
    const pickColorBtn = document.getElementById('pickColorBtn');
    const colorPreview = document.getElementById('colorPreview');
    const toleranceInput = document.getElementById('toleranceInput');
    const toleranceText = document.getElementById('toleranceText');
    const cropBtn = document.getElementById('cropBtn');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const resetBtn = document.getElementById('resetBtn');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const hint = document.getElementById('hint');
    const previewBox = document.getElementById('previewBox');
    const previewGrid = document.getElementById('previewGrid');
    const info = document.getElementById('info');
    const modal = document.getElementById('modal');
    const modalImg = document.getElementById('modalImg');
    const modalTitle = document.getElementById('modalTitle');
    const closeModalBtn = document.getElementById('closeModalBtn');

    let image = null;
    let imageScale = 1;
    let startX = 0;
    let startY = 0;
    let cropBox = null;
    let isDragging = false;
    let activeGridLine = null;
    let activeCropEdge = null;
    let isPickingColor = false;
    let pickedColor = null;
    let croppedImages = [];
    let gridSplits = { cols: 0, rows: 0, x: [], y: [] };

    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        image = new Image();
        image.onload = () => {
          setupCanvas();
          cropBtn.disabled = false;
          resetBtn.disabled = false;
          pickColorBtn.disabled = false;
          downloadAllBtn.disabled = true;
          previewBox.style.display = 'none';
          previewGrid.innerHTML = '';
          croppedImages = [];
          hint.style.display = 'none';
          info.textContent = `ขนาดรูปจริง: ${image.width} × ${image.height}px`;
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

    colsInput.addEventListener('input', () => {
      resetGridSplits();
      draw();
    });
    rowsInput.addEventListener('input', () => {
      resetGridSplits();
      draw();
    });
    lineWidthInput.addEventListener('input', () => {
      lineWidthText.textContent = lineWidthInput.value;
      draw();
    });
    ratioSelect.addEventListener('change', draw);
    toleranceInput.addEventListener('input', () => toleranceText.textContent = toleranceInput.value);

    pickColorBtn.addEventListener('click', () => {
      if (!image) return;
      isPickingColor = !isPickingColor;
      pickColorBtn.classList.toggle('active', isPickingColor);
      canvas.classList.toggle('pick-mode', isPickingColor);
      info.textContent = isPickingColor ? 'โหมดดูดสี: คลิกสีพื้นหลังบนรูปที่ต้องการลบ' : 'ปิดโหมดดูดสีแล้ว';
    });

    modal.addEventListener('click', closeView);
    closeModalBtn.addEventListener('click', closeView);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeView();
    });

    function openView(src, title = 'Preview') {
      modalImg.src = src;
      modalTitle.textContent = title;
      modal.classList.add('show');
    }

    function closeView() {
      modal.classList.remove('show');
      modalImg.src = '';
    }

    function setupCanvas() {
      const maxWidth = 950;
      const maxHeight = 650;
      imageScale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      canvas.width = Math.round(image.width * imageScale);
      canvas.height = Math.round(image.height * imageScale);
      cropBox = null;
      resetGridSplits();
      draw();
    }

    function draw() {
      if (!image) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      if (!cropBox) return;

      const cols = getSafeNumber(colsInput.value, 1, 20);
      const rows = getSafeNumber(rowsInput.value, 1, 20);
      ensureGridSplits(cols, rows);

      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.clearRect(cropBox.x, cropBox.y, cropBox.w, cropBox.h);
      ctx.drawImage(image, cropBox.x / imageScale, cropBox.y / imageScale, cropBox.w / imageScale, cropBox.h / imageScale, cropBox.x, cropBox.y, cropBox.w, cropBox.h);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = getLineWidth();
      ctx.strokeRect(cropBox.x, cropBox.y, cropBox.w, cropBox.h);

      ctx.strokeStyle = 'rgba(56,189,248,0.9)';
      ctx.lineWidth = getLineWidth();

      gridSplits.x.forEach((split) => {
        const x = cropBox.x + cropBox.w * split;
        ctx.beginPath();
        ctx.moveTo(x, cropBox.y);
        ctx.lineTo(x, cropBox.y + cropBox.h);
        ctx.stroke();
      });

      gridSplits.y.forEach((split) => {
        const y = cropBox.y + cropBox.h * split;
        ctx.beginPath();
        ctx.moveTo(cropBox.x, y);
        ctx.lineTo(cropBox.x + cropBox.w, y);
        ctx.stroke();
      });

      ctx.restore();
    }

    canvas.addEventListener('mousedown', (event) => {
      if (!image) return;
      if (isPickingColor) {
        pickColor(event);
        return;
      }

      const pos = getMousePos(event);
      const gridLine = getGridLineAt(pos);
      if (gridLine) {
        activeGridLine = gridLine;
        canvas.classList.toggle('grid-col-mode', gridLine.axis === 'x');
        canvas.classList.toggle('grid-row-mode', gridLine.axis === 'y');
        return;
      }

      const cropEdge = getCropEdgeAt(pos);
      if (cropEdge) {
        activeCropEdge = cropEdge;
        updateGridCursor(pos);
        return;
      }

      startX = pos.x;
      startY = pos.y;
      isDragging = true;
      updateGridCursor();
      resetGridSplits();
      cropBox = { x: startX, y: startY, w: 0, h: 0 };
    });

    canvas.addEventListener('mousemove', (event) => {
      if (!image || isPickingColor) return;
      const pos = getMousePos(event);

      if (activeGridLine) {
        moveGridLine(activeGridLine, pos);
        draw();
        return;
      }

      if (activeCropEdge) {
        moveCropEdge(activeCropEdge, pos);
        draw();
        return;
      }

      if (!isDragging) {
        updateGridCursor(pos);
        return;
      }

      updateCropBox(pos.x, pos.y);
      draw();
    });

    window.addEventListener('mouseup', () => {
      if (activeGridLine) {
        activeGridLine = null;
        updateGridCursor();
      }

      if (activeCropEdge) {
        activeCropEdge = null;
        normalizeCropBox();
        updateGridCursor();
        draw();
      }

      if (isDragging) {
        isDragging = false;
        normalizeCropBox();
        resetGridSplits();
        draw();
      }
    });

    function pickColor(event) {
      const pos = getMousePos(event);
      const pixel = ctx.getImageData(Math.round(pos.x), Math.round(pos.y), 1, 1).data;
      pickedColor = { r: pixel[0], g: pixel[1], b: pixel[2] };
      colorPreview.style.background = `rgb(${pickedColor.r}, ${pickedColor.g}, ${pickedColor.b})`;
      removeBgChk.checked = true;
      isPickingColor = false;
      pickColorBtn.classList.remove('active');
      canvas.classList.remove('pick-mode');
      info.textContent = `เลือกสีลบแล้ว: RGB(${pickedColor.r}, ${pickedColor.g}, ${pickedColor.b}) | ปรับความใกล้เคียงได้`;
    }

    function getMousePos(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(canvas.width - 1, event.clientX - rect.left)),
        y: Math.max(0, Math.min(canvas.height - 1, event.clientY - rect.top))
      };
    }

    function updateCropBox(currentX, currentY) {
      let width = currentX - startX;
      let height = currentY - startY;
      const ratio = ratioSelect.value;

      if (ratio !== 'free') {
        const [rw, rh] = ratio.split(':').map(Number);
        const fixedRatio = rw / rh;
        const directionX = width < 0 ? -1 : 1;
        const directionY = height < 0 ? -1 : 1;

        if (Math.abs(width) / fixedRatio <= Math.abs(height)) height = Math.abs(width) / fixedRatio * directionY;
        else width = Math.abs(height) * fixedRatio * directionX;
      }

      cropBox = { x: startX, y: startY, w: width, h: height };
    }

    function normalizeCropBox() {
      if (!cropBox) return;
      const x = Math.min(cropBox.x, cropBox.x + cropBox.w);
      const y = Math.min(cropBox.y, cropBox.y + cropBox.h);
      const w = Math.abs(cropBox.w);
      const h = Math.abs(cropBox.h);
      cropBox = {
        x: Math.max(0, x),
        y: Math.max(0, y),
        w: Math.min(w, canvas.width - Math.max(0, x)),
        h: Math.min(h, canvas.height - Math.max(0, y))
      };
    }

    function resetGridSplits() {
      gridSplits = { cols: 0, rows: 0, x: [], y: [] };
    }

    function ensureGridSplits(cols, rows) {
      if (gridSplits.cols !== cols) {
        gridSplits.cols = cols;
        gridSplits.x = createEvenSplits(cols);
      }

      if (gridSplits.rows !== rows) {
        gridSplits.rows = rows;
        gridSplits.y = createEvenSplits(rows);
      }
    }

    function createEvenSplits(count) {
      const splits = [];
      for (let i = 1; i < count; i++) splits.push(i / count);
      return splits;
    }

    function getGridBounds() {
      return {
        x: [0, ...gridSplits.x, 1],
        y: [0, ...gridSplits.y, 1]
      };
    }

    function getGridLineAt(pos) {
      if (!cropBox || cropBox.w < 5 || cropBox.h < 5) return null;
      const cols = getSafeNumber(colsInput.value, 1, 20);
      const rows = getSafeNumber(rowsInput.value, 1, 20);
      ensureGridSplits(cols, rows);

      const hitArea = 8;
      const insideX = pos.x >= cropBox.x && pos.x <= cropBox.x + cropBox.w;
      const insideY = pos.y >= cropBox.y && pos.y <= cropBox.y + cropBox.h;
      if (!insideX || !insideY) return null;

      let nearest = null;
      gridSplits.x.forEach((split, index) => {
        const x = cropBox.x + cropBox.w * split;
        const distance = Math.abs(pos.x - x);
        if (distance <= hitArea && (!nearest || distance < nearest.distance)) {
          nearest = { axis: 'x', index, distance };
        }
      });

      gridSplits.y.forEach((split, index) => {
        const y = cropBox.y + cropBox.h * split;
        const distance = Math.abs(pos.y - y);
        if (distance <= hitArea && (!nearest || distance < nearest.distance)) {
          nearest = { axis: 'y', index, distance };
        }
      });

      return nearest;
    }

    function getCropEdgeAt(pos) {
      if (!cropBox || cropBox.w < 5 || cropBox.h < 5) return null;

      const hitArea = 8;
      const left = cropBox.x;
      const right = cropBox.x + cropBox.w;
      const top = cropBox.y;
      const bottom = cropBox.y + cropBox.h;
      const nearY = pos.y >= top - hitArea && pos.y <= bottom + hitArea;
      const nearX = pos.x >= left - hitArea && pos.x <= right + hitArea;
      const candidates = [];

      if (nearY && Math.abs(pos.x - left) <= hitArea) {
        candidates.push({ side: 'left', axis: 'x', distance: Math.abs(pos.x - left) });
      }
      if (nearY && Math.abs(pos.x - right) <= hitArea) {
        candidates.push({ side: 'right', axis: 'x', distance: Math.abs(pos.x - right) });
      }
      if (nearX && Math.abs(pos.y - top) <= hitArea) {
        candidates.push({ side: 'top', axis: 'y', distance: Math.abs(pos.y - top) });
      }
      if (nearX && Math.abs(pos.y - bottom) <= hitArea) {
        candidates.push({ side: 'bottom', axis: 'y', distance: Math.abs(pos.y - bottom) });
      }

      return candidates.sort((a, b) => a.distance - b.distance)[0] || null;
    }

    function moveGridLine(line, pos) {
      if (!cropBox) return;
      const list = line.axis === 'x' ? gridSplits.x : gridSplits.y;
      const cropSize = line.axis === 'x' ? cropBox.w : cropBox.h;
      const cropStart = line.axis === 'x' ? cropBox.x : cropBox.y;
      const pointer = line.axis === 'x' ? pos.x : pos.y;
      const minGap = Math.min(0.02, 4 / Math.max(cropSize, 1));
      const min = line.index === 0 ? minGap : list[line.index - 1] + minGap;
      const max = line.index === list.length - 1 ? 1 - minGap : list[line.index + 1] - minGap;
      list[line.index] = Math.max(min, Math.min(max, (pointer - cropStart) / cropSize));
    }

    function moveCropEdge(edge, pos) {
      if (!cropBox) return;

      const minSize = 12;
      const right = cropBox.x + cropBox.w;
      const bottom = cropBox.y + cropBox.h;

      if (edge.side === 'left') {
        const x = Math.max(0, Math.min(pos.x, right - minSize));
        cropBox.w = right - x;
        cropBox.x = x;
      } else if (edge.side === 'right') {
        cropBox.w = Math.max(minSize, Math.min(pos.x, canvas.width) - cropBox.x);
      } else if (edge.side === 'top') {
        const y = Math.max(0, Math.min(pos.y, bottom - minSize));
        cropBox.h = bottom - y;
        cropBox.y = y;
      } else if (edge.side === 'bottom') {
        cropBox.h = Math.max(minSize, Math.min(pos.y, canvas.height) - cropBox.y);
      }
    }

    function updateGridCursor(pos = null) {
      const line = pos ? getGridLineAt(pos) : null;
      const edge = pos && !line ? getCropEdgeAt(pos) : null;
      const axis = line ? line.axis : edge ? edge.axis : null;
      canvas.classList.toggle('grid-col-mode', axis === 'x');
      canvas.classList.toggle('grid-row-mode', axis === 'y');
    }

    cropBtn.addEventListener('click', () => {
      if (!image || !cropBox || cropBox.w < 5 || cropBox.h < 5) {
        alert('กรุณาลากกรอบบนรูปก่อน');
        return;
      }

      const cols = getSafeNumber(colsInput.value, 1, 20);
      const rows = getSafeNumber(rowsInput.value, 1, 20);
      const realX = Math.round(cropBox.x / imageScale);
      const realY = Math.round(cropBox.y / imageScale);
      ensureGridSplits(cols, rows);
      const bounds = getGridBounds();
      const lineInset = getLineWidth() / 2;

      croppedImages = [];
      previewGrid.innerHTML = '';
      let index = 1;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const left = c === 0
            ? cropBox.x + lineInset
            : cropBox.x + cropBox.w * bounds.x[c] + lineInset;
          const top = r === 0
            ? cropBox.y + lineInset
            : cropBox.y + cropBox.h * bounds.y[r] + lineInset;
          const right = c === cols - 1
            ? cropBox.x + cropBox.w - lineInset
            : cropBox.x + cropBox.w * bounds.x[c + 1] - lineInset;
          const bottom = r === rows - 1
            ? cropBox.y + cropBox.h - lineInset
            : cropBox.y + cropBox.h * bounds.y[r + 1] - lineInset;

          const sx = realX + Math.round((left - cropBox.x) / imageScale);
          const sy = realY + Math.round((top - cropBox.y) / imageScale);
          const nextX = realX + Math.round((right - cropBox.x) / imageScale);
          const nextY = realY + Math.round((bottom - cropBox.y) / imageScale);
          const sw = nextX - sx;
          const sh = nextY - sy;
          if (sw < 1 || sh < 1) continue;

          const output = document.createElement('canvas');
          output.width = sw;
          output.height = sh;
          const outputCtx = output.getContext('2d', { willReadFrequently: true });
          outputCtx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);

          let finalCanvas = output;
          if (removeBgChk.checked) finalCanvas = removeBackgroundFromCanvas(output);

          const dataUrl = finalCanvas.toDataURL('image/png');
          const fileName = `crop-r${r + 1}-c${c + 1}.png`;
          croppedImages.push({ dataUrl, fileName });
          addPreview(dataUrl, fileName, index++);
        }
      }

      previewBox.style.display = 'block';
      downloadAllBtn.disabled = false;
      info.textContent = `ตัดแล้ว ${croppedImages.length} รูป | ตาราง ${cols} × ${rows} | ลบพื้นหลัง: ${removeBgChk.checked ? 'ON' : 'OFF'}`;
    });

    function removeBackgroundFromCanvas(srcCanvas) {
      const c = document.createElement('canvas');
      c.width = srcCanvas.width;
      c.height = srcCanvas.height;
      const ctx2 = c.getContext('2d', { willReadFrequently: true });
      ctx2.drawImage(srcCanvas, 0, 0);

      const imgData = ctx2.getImageData(0, 0, c.width, c.height);
      const data = imgData.data;
      const tolerance = Number(toleranceInput.value);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        let remove = false;

        if (pickedColor) {
          const distance = Math.sqrt(
            Math.pow(r - pickedColor.r, 2) +
            Math.pow(g - pickedColor.g, 2) +
            Math.pow(b - pickedColor.b, 2)
          );
          remove = distance <= tolerance;
        } else {
          remove = (r > 240 && g > 240 && b > 240) || (g > 180 && g > r + 30 && g > b + 30);
        }

        if (remove) data[i + 3] = 0;
      }

      ctx2.putImageData(imgData, 0, 0);
      return c;
    }

    function addPreview(dataUrl, fileName, index) {
      const box = document.createElement('div');
      box.className = 'preview-item';

      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = fileName;
      img.onclick = () => openView(dataUrl, fileName);

      const text = document.createElement('small');
      text.textContent = `${index}. ${fileName}`;

      const actions = document.createElement('div');
      actions.className = 'preview-actions';

      const btnView = document.createElement('button');
      btnView.textContent = 'View';
      btnView.className = 'secondary';
      btnView.onclick = () => openView(dataUrl, fileName);

      const btnDownload = document.createElement('button');
      btnDownload.textContent = 'Download';
      btnDownload.onclick = () => downloadImage(dataUrl, fileName);

      actions.appendChild(btnView);
      actions.appendChild(btnDownload);
      box.appendChild(img);
      box.appendChild(text);
      box.appendChild(actions);
      previewGrid.appendChild(box);
    }

    downloadAllBtn.addEventListener('click', async () => {
      if (!croppedImages.length) return;

      if (typeof JSZip === 'undefined') {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
      }

      const zip = new JSZip();
      croppedImages.forEach((item) => {
        const base64 = item.dataUrl.split(',')[1];
        zip.file(item.fileName, base64, { base64: true });
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'cropped-images.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });

    function loadScript(src) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    }

    resetBtn.addEventListener('click', () => {
      cropBox = null;
      activeGridLine = null;
      activeCropEdge = null;
      resetGridSplits();
      croppedImages = [];
      downloadAllBtn.disabled = true;
      previewBox.style.display = 'none';
      previewGrid.innerHTML = '';
      draw();
      if (image) info.textContent = `ขนาดรูปจริง: ${image.width} × ${image.height}px`;
    });

    function downloadImage(dataUrl, fileName) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    function getSafeNumber(value, min, max) {
      const num = parseInt(value, 10);
      if (Number.isNaN(num)) return min;
      return Math.max(min, Math.min(max, num));
    }

    function getSafeFloat(value, min, max) {
      const num = parseFloat(value);
      if (Number.isNaN(num)) return min;
      return Math.max(min, Math.min(max, num));
    }

    function getLineWidth() {
      return getSafeFloat(lineWidthInput.value, 0.5, 10);
    }

