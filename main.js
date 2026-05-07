// ==========================================
// 1. 変数の初期化
// ==========================================
let currentMode = 'pan';
let isDrawing = false;
let strokes = []; 
let currentStroke = null;

// ==========================================
// 2. 地図の初期化
// ==========================================
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty', 
    center: [135, 35],
    zoom: 4,
    hash: true,
    // 【変更】デフォルトのクレジット表記に以下のテキストを追加する
    customAttribution: '© OpenStreetMap contributors'
});
map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

// ==========================================
// 3. 描画キャンバスの初期化とグリッドラベル描画
// ==========================================
const canvas = document.getElementById('draw-canvas');
const ctx = canvas.getContext('2d');

function renderGridLabels() {
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 12px Arial';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;

    const center = map.getCenter();
    const bounds = map.getBounds();

    const startLng = Math.floor(bounds.getWest() / 10) * 10;
    const endLng = Math.ceil(bounds.getEast() / 10) * 10;
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let lng = startLng; lng <= endLng; lng += 10) {
        const x = map.project([lng, center.lat]).x;
        
        if (x >= 0 && x <= canvas.width) {
            let displayLng = lng % 360;
            if (displayLng > 180) displayLng -= 360;
            if (displayLng < -180) displayLng += 360;
            if (displayLng === -0) displayLng = 0;
            
            const text = `${displayLng}°`;
            ctx.strokeText(text, x, 5);
            ctx.fillText(text, x, 5);
        }
    }

    const startLat = Math.max(-80, Math.floor(bounds.getSouth() / 10) * 10);
    const endLat = Math.min(80, Math.ceil(bounds.getNorth() / 10) * 10);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let lat = startLat; lat <= endLat; lat += 10) {
        const y = map.project([center.lng, lat]).y;
        
        if (y >= 0 && y <= canvas.height) {
            let text = '';
            if (lat > 0) {
                text = `N.${lat}°`;
            } else if (lat < 0) {
                text = `S.${Math.abs(lat)}°`;
            } else {
                text = `0°`;
            }

            ctx.strokeText(text, 5, y);
            ctx.fillText(text, 5, y);
        }
    }
}

function renderCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    renderGridLabels();

    strokes.forEach(stroke => {
        if (stroke.points.length < 2) return;
        
        ctx.beginPath();
        const startPoint = map.project(stroke.points[0]);
        ctx.moveTo(startPoint.x, startPoint.y);
        for (let i = 1; i < stroke.points.length; i++) {
            const point = map.project(stroke.points[i]);
            ctx.lineTo(point.x, point.y);
        }
        ctx.strokeStyle = stroke.color === 'red' ? '#ff0000' : '#0066ff';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        if (stroke.type === 'arrow-red' || stroke.type === 'arrow-blue') {
            const p1 = map.project(stroke.points[0]);
            const p2 = map.project(stroke.points[1]);
            const headlen = 20; 
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            
            ctx.beginPath();
            ctx.moveTo(p2.x, p2.y);
            ctx.lineTo(p2.x - headlen * Math.cos(angle - Math.PI / 6), p2.y - headlen * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(p2.x - headlen * Math.cos(angle + Math.PI / 6), p2.y - headlen * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            
            ctx.fillStyle = ctx.strokeStyle;
            ctx.fill();
        }
    });
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    renderCanvas();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ==========================================
// 4. 地図読み込み後のレイヤー設定
// ==========================================
map.on('load', () => {
    const gridData = { type: 'FeatureCollection', features: [] };
    for (let i = -180; i <= 180; i += 10) gridData.features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[i, -85], [i, 85]] }});
    for (let i = -80; i <= 80; i += 10) gridData.features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[-180, i], [180, i]] }});
    map.addSource('grid', { type: 'geojson', data: gridData });
    map.addLayer({ id: 'grid-layer', type: 'line', source: 'grid', paint: { 'line-color': '#aaa', 'line-width': 0.6 }});

    const mountainData = {
        type: 'FeatureCollection',
        features: [
            { type: 'Feature', properties: { name: 'ヒマラヤ山脈' }, geometry: { type: 'Point', coordinates: [86.9, 27.9] } },
            { type: 'Feature', properties: { name: 'アルプス山脈' }, geometry: { type: 'Point', coordinates: [10.0, 46.5] } },
            { type: 'Feature', properties: { name: 'ロッキー山脈' }, geometry: { type: 'Point', coordinates: [-110.0, 45.0] } },
            { type: 'Feature', properties: { name: 'アンデス山脈' }, geometry: { type: 'Point', coordinates: [-70.0, -20.0] } },
            { type: 'Feature', properties: { name: 'アトラス山脈' }, geometry: { type: 'Point', coordinates: [-5.0, 32.0] } },
            { type: 'Feature', properties: { name: 'カフカス山脈' }, geometry: { type: 'Point', coordinates: [43.0, 42.5] } },
            { type: 'Feature', properties: { name: 'ザグロス山脈' }, geometry: { type: 'Point', coordinates: [50.0, 33.0] } },
            { type: 'Feature', properties: { name: 'ピレネー山脈' }, geometry: { type: 'Point', coordinates: [0.5, 42.6] } },
            { type: 'Feature', properties: { name: 'アペニン山脈' }, geometry: { type: 'Point', coordinates: [13.0, 43.0] } },
            { type: 'Feature', properties: { name: 'テンシャン山脈' }, geometry: { type: 'Point', coordinates: [80.0, 42.0] } },
            { type: 'Feature', properties: { name: 'アパラチア山脈' }, geometry: { type: 'Point', coordinates: [-80.0, 38.0] } },
            { type: 'Feature', properties: { name: 'ウラル山脈' }, geometry: { type: 'Point', coordinates: [60.0, 60.0] } },
            { type: 'Feature', properties: { name: 'グレートディヴァイディング山脈' }, geometry: { type: 'Point', coordinates: [150.0, -25.0] } },
            { type: 'Feature', properties: { name: '飛騨山脈' }, geometry: { type: 'Point', coordinates: [137.6, 36.4] } },
            { type: 'Feature', properties: { name: '木曽山脈' }, geometry: { type: 'Point', coordinates: [137.8, 35.8] } },
            { type: 'Feature', properties: { name: '赤石山脈' }, geometry: { type: 'Point', coordinates: [138.2, 35.3] } }
        ]
    };
    
    map.addSource('mountains', { type: 'geojson', data: mountainData });
    map.addLayer({
        id: 'mountain-range-names', 
        type: 'symbol',
        source: 'mountains',
        layout: { 
            'text-field': ['get', 'name'], 
            'text-size': 14, 
            'text-anchor': 'center' 
        },
        paint: { 'text-color': '#5C3317', 'text-halo-color': '#ffffff', 'text-halo-width': 2 }
    });

    document.querySelectorAll('#layer-list input').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const keyword = e.target.getAttribute('data-layer').toLowerCase();
            const visibility = e.target.checked ? 'visible' : 'none';
            
            map.getStyle().layers.forEach(layer => {
                const lid = layer.id.toLowerCase();
                let isTarget = false;

                if (keyword === 'place') {
                    if (lid.includes('place') || lid.includes('country') || lid.includes('city') || lid.includes('label')) {
                        isTarget = true;
                    }
                } else if (lid.includes(keyword)) {
                    isTarget = true;
                }

                if (isTarget) {
                    map.setLayoutProperty(layer.id, 'visibility', visibility);
                }
            });
        });
    });

    document.getElementById('menu-button').onclick = () => document.getElementById('menu-container').classList.toggle('hidden');
});

// ==========================================
// 5. ツールバーと描画ロジック
// ==========================================
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.tool-btn:not(#btn-clear):not(#btn-fullscreen)').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`mode-${mode}`).classList.add('active');
    canvas.style.pointerEvents = mode === 'pan' ? 'none' : 'auto';
}

document.getElementById('mode-pan').onclick = () => setMode('pan');
document.getElementById('mode-red').onclick = () => setMode('red');
document.getElementById('mode-blue').onclick = () => setMode('blue');
document.getElementById('mode-line-red').onclick = () => setMode('line-red');
document.getElementById('mode-line-blue').onclick = () => setMode('line-blue');
document.getElementById('mode-arrow-red').onclick = () => setMode('arrow-red');
document.getElementById('mode-arrow-blue').onclick = () => setMode('arrow-blue');
document.getElementById('mode-eraser').onclick = () => setMode('eraser');

document.getElementById('btn-clear').onclick = (e) => {
    const btn = e.target.closest('.tool-btn');
    btn.classList.add('active');
    setTimeout(() => btn.classList.remove('active'), 150); 
    strokes = []; renderCanvas(); 
};

function getPos(e) {
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
}

function startDrawing(e) {
    if (currentMode === 'pan') return;
    isDrawing = true;
    const pos = getPos(e);
    const lngLat = map.unproject([pos.x, pos.y]);

    if (currentMode === 'red' || currentMode === 'blue') {
        currentStroke = { type: currentMode, color: currentMode, points: [lngLat] };
        strokes.push(currentStroke);
    } else if (currentMode === 'line-red' || currentMode === 'line-blue' || currentMode === 'arrow-red' || currentMode === 'arrow-blue') {
        const color = (currentMode === 'line-red' || currentMode === 'arrow-red') ? 'red' : 'blue';
        currentStroke = { type: currentMode, color: color, points: [lngLat, lngLat] };
        strokes.push(currentStroke);
    } else if (currentMode === 'eraser') {
        eraseStroke(pos);
    }
    if (e.cancelable) e.preventDefault();
}

function draw(e) {
    if (!isDrawing || currentMode === 'pan') return;
    const pos = getPos(e);
    const lngLat = map.unproject([pos.x, pos.y]);

    if (currentMode === 'red' || currentMode === 'blue') {
        if (currentStroke) {
            currentStroke.points.push(lngLat);
            renderCanvas();
        }
    } else if (currentMode === 'line-red' || currentMode === 'line-blue' || currentMode === 'arrow-red' || currentMode === 'arrow-blue') {
        if (currentStroke) {
            currentStroke.points[1] = lngLat; 
            renderCanvas();
        }
    } else if (currentMode === 'eraser') {
        eraseStroke(pos);
    }
    if (e.cancelable) e.preventDefault();
}

function eraseStroke(pos) {
    const threshold = 20;

    function getDistanceToSegment(p, v, w) {
        const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
        if (l2 === 0) return Math.sqrt(Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2));
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t)); 
        const projX = v.x + t * (w.x - v.x);
        const projY = v.y + t * (w.y - v.y);
        return Math.sqrt(Math.pow(p.x - projX, 2) + Math.pow(p.y - projY, 2));
    }

    strokes = strokes.filter(stroke => {
        if (stroke.points.length === 1) {
            const sp = map.project(stroke.points[0]);
            return Math.sqrt(Math.pow(pos.x - sp.x, 2) + Math.pow(pos.y - sp.y, 2)) >= threshold;
        }
        for (let i = 0; i < stroke.points.length - 1; i++) {
            const p1 = map.project(stroke.points[i]);
            const p2 = map.project(stroke.points[i + 1]);
            if (getDistanceToSegment(pos, p1, p2) < threshold) return false;
        }
        return true;
    });
    renderCanvas();
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', () => { isDrawing = false; currentStroke = null; });
canvas.addEventListener('touchstart', startDrawing, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', () => { isDrawing = false; currentStroke = null; });

map.on('move', renderCanvas);

document.getElementById('btn-fullscreen').onclick = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
};