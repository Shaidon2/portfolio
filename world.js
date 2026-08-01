// ===================================================
// 3D WORLD
// Your real <section> elements are placed as panels in a
// three.js scene via CSS3DRenderer, so the markup stays live
// (text is indexable, the contact form still posts, videos
// still play). A WebGL layer renders the environment behind
// them and the camera flies between stations on navigation.
// Loaded only when index.html decides the device can take it.
// ===================================================

import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';

const FOG_COLOR = 0x16181c;
const ACCENT = 0x01f0f8;

// where each section sits in the world, and which way it faces
const STATIONS = [
    { id: 'home', label: 'home', x: 0, y: 0, z: 0, ry: 0 },
    { id: 'services', label: 'services', x: 2600, y: 180, z: -3000, ry: -38 },
    { id: 'resume', label: 'resume', x: 600, y: -140, z: -6600, ry: 14 },
    { id: 'portfolio', label: 'portfolio', x: -2800, y: 220, z: -9200, ry: 34 },
    { id: 'affiliates', label: 'affiliates', x: -600, y: -90, z: -12400, ry: -10 },
    { id: 'contact', label: 'contact', x: 2200, y: 140, z: -15200, ry: -30 },
];

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
};

// ---------------------------------------------------
// renderers
// ---------------------------------------------------
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(FOG_COLOR, 0.000105);

const cssScene = new THREE.Scene();

// phones get a lighter world: fewer objects, no antialiasing and a capped
// pixel ratio. a modern phone reports devicePixelRatio 3, which would mean
// rendering nine times the pixels of a logical one - enough to drop frames
// on mid-range hardware.
const MOBILE = window.innerWidth <= 900;
const COARSE = window.matchMedia('(pointer: coarse)').matches;

// How far the camera may drift from the panel it is parked at.
// The phone values are scaled down, not switched off. A phone panel sits
// with only ~24 world units of margin either side (the panel is 420 wide in
// a ~487-unit view), so 85 units of sideways sway walks its edge clean off
// the screen. 18 keeps the movement visible but inside the margin.
const SWAY = (MOBILE || COARSE)
    ? { x: 13, y: 20, idle: 5, yaw: 0.006, pitch: 0.004 }
    : { x: 85, y: 55, idle: 9, yaw: 0.018, pitch: 0.012 };

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 10, 60000);

const renderer = new THREE.WebGLRenderer({
    antialias: !MOBILE,
    powerPreference: 'high-performance',
});
renderer.domElement.id = 'world-gl';
renderer.setPixelRatio(Math.min(window.devicePixelRatio, MOBILE ? 1.25 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(FOG_COLOR, 1);
document.body.appendChild(renderer.domElement);

const cssRenderer = new CSS3DRenderer();
cssRenderer.domElement.id = 'world-css';
cssRenderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(cssRenderer.domElement);

const haze = document.createElement('div');
haze.id = 'world-haze';
document.body.appendChild(haze);

// ---------------------------------------------------
// panels - your sections, mounted into the scene
// ---------------------------------------------------
const panels = [];

STATIONS.forEach(station => {
    const el = document.getElementById(station.id);
    if (!el) return;

    const object = new CSS3DObject(el);
    object.position.set(station.x, station.y, station.z);
    object.rotation.y = THREE.MathUtils.degToRad(station.ry);
    cssScene.add(object);

    panels.push({
        station,
        el,
        object,
        center: new THREE.Vector3(station.x, station.y, station.z),
        normal: new THREE.Vector3(
            Math.sin(THREE.MathUtils.degToRad(station.ry)),
            0,
            Math.cos(THREE.MathUtils.degToRad(station.ry))
        ),
        anchor: new THREE.Vector3(),
        quat: new THREE.Quaternion(),
        fitDist: 2000,
    });
});

// distance at which a panel exactly fills the viewport, so the
// framing stays right on any window size
const measurePanels = () => {
    const halfFov = THREE.MathUtils.degToRad(camera.fov) / 2;
    const look = new THREE.Matrix4();
    const up = new THREE.Vector3(0, 1, 0);

    panels.forEach(panel => {
        const w = panel.el.offsetWidth || 1600;
        const h = panel.el.offsetHeight || 1000;
        const distH = (h / 2) / Math.tan(halfFov);
        const distW = (w / 2) / (Math.tan(halfFov) * camera.aspect);

        panel.fitDist = Math.max(distH, distW) * 1.16;
        panel.anchor.copy(panel.center).addScaledVector(panel.normal, panel.fitDist);
        look.lookAt(panel.anchor, panel.center, up);
        panel.quat.setFromRotationMatrix(look);
    });
};

measurePanels();

// ---------------------------------------------------
// environment
// ---------------------------------------------------
const radialTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(1, 240, 248, 0.85)');
    gradient.addColorStop(0.35, 'rgba(1, 240, 248, 0.22)');
    gradient.addColorStop(1, 'rgba(1, 240, 248, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
};

const glowTexture = radialTexture();

// --- grid planes, floor and ceiling ---
const gridMaterial = (opacity, fadeStart, fadeEnd) => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
        uColor: { value: new THREE.Color(ACCENT) },
        uOpacity: { value: opacity },
        uFade: { value: new THREE.Vector2(fadeStart, fadeEnd) },
        uCam: { value: new THREE.Vector3() },
    },
    vertexShader: `
        varying vec3 vWorld;
        void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorld = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform vec2 uFade;
        uniform vec3 uCam;
        varying vec3 vWorld;

        float lineMask(vec2 p, float scale) {
            vec2 c = p / scale;
            vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c);
            return 1.0 - min(min(g.x, g.y), 1.0);
        }

        void main() {
            vec2 p = vWorld.xz;
            float minor = lineMask(p, 420.0) * 0.32;
            float major = lineMask(p, 2100.0) * 0.9;
            float mask = max(minor, major);
            float fade = 1.0 - smoothstep(uFade.x, uFade.y, distance(vWorld, uCam));
            float alpha = mask * fade * uOpacity;
            if (alpha < 0.004) discard;
            gl_FragColor = vec4(uColor, alpha);
        }
    `,
});

const gridGeometry = new THREE.PlaneGeometry(120000, 120000);

const floorMaterial = gridMaterial(0.5, 2500, 20000);
const floor = new THREE.Mesh(gridGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -900;
scene.add(floor);

const ceilingMaterial = gridMaterial(0.18, 2500, 15000);
const ceiling = new THREE.Mesh(gridGeometry, ceilingMaterial);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = 2100;
scene.add(ceiling);

// --- monoliths, the distant structures that give parallax ---
const buildMonoliths = () => {
    const count = 54;
    const template = new THREE.BoxGeometry(1, 1, 1);
    const edgeTemplate = new THREE.EdgesGeometry(template);
    const edgePositions = edgeTemplate.attributes.position.array;
    const edgeVertexCount = edgePositions.length / 3;

    const solid = new THREE.InstancedMesh(
        template,
        new THREE.MeshBasicMaterial({ color: 0x1a1d21, fog: true }),
        count
    );

    const merged = new Float32Array(edgeVertexCount * 3 * count);
    const matrix = new THREE.Matrix4();
    const vertex = new THREE.Vector3();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    let placed = 0;
    let attempts = 0;

    while (placed < count && attempts < count * 40) {
        attempts++;

        const z = 3000 - Math.random() * 22000;
        const x = (Math.random() - 0.5) * 17000;
        const height = 1400 + Math.random() * 5200;
        const width = 320 + Math.random() * 900;

        position.set(x, -900 + height / 2, z);

        // keep the flight path clear
        const tooClose = panels.some(panel =>
            position.distanceTo(panel.center) < 3000 ||
            position.distanceTo(panel.anchor) < 3000
        );
        if (tooClose) continue;

        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI);
        scale.set(width, height, width * (0.6 + Math.random() * 0.8));
        matrix.compose(position, quaternion, scale);
        solid.setMatrixAt(placed, matrix);

        for (let v = 0; v < edgeVertexCount; v++) {
            vertex.fromArray(edgePositions, v * 3).applyMatrix4(matrix);
            vertex.toArray(merged, (placed * edgeVertexCount + v) * 3);
        }

        placed++;
    }

    solid.count = placed;
    solid.instanceMatrix.needsUpdate = true;
    scene.add(solid);

    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(merged.subarray(0, placed * edgeVertexCount * 3), 3)
    );

    scene.add(new THREE.LineSegments(
        edgeGeometry,
        new THREE.LineBasicMaterial({
            color: ACCENT,
            transparent: true,
            opacity: 0.12,
            fog: true,
        })
    ));
};

buildMonoliths();

// ---------------------------------------------------
// moving solids
// everything pushed into `spinners` is rotated / bobbed
// once per frame by the main loop
// ---------------------------------------------------
const spinners = [];

// a dim solid inside a bright wireframe reads well against the fog
const wireSolid = (geometry, options = {}) => {
    const group = new THREE.Group();

    group.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        color: options.fill || 0x101418,
        transparent: true,
        opacity: options.fillOpacity != null ? options.fillOpacity : 0.6,
        fog: true,
    })));

    group.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, options.threshold || 18),
        new THREE.LineBasicMaterial({
            color: options.color || ACCENT,
            transparent: true,
            opacity: options.lineOpacity != null ? options.lineOpacity : 0.5,
            fog: true,
        })
    ));

    return group;
};

const clearOfPanels = (position, radius) => !panels.some(panel =>
    position.distanceTo(panel.center) < radius ||
    position.distanceTo(panel.anchor) < radius
);

// --- drifting polyhedra scattered down the corridor ---
const buildFloaters = () => {
    const shapes = [
        () => new THREE.IcosahedronGeometry(190, 0),
        () => new THREE.OctahedronGeometry(215, 0),
        () => new THREE.DodecahedronGeometry(180, 0),
        () => new THREE.TetrahedronGeometry(235, 0),
        () => new THREE.TorusGeometry(185, 44, 7, 18),
        () => new THREE.TorusKnotGeometry(135, 32, 48, 6),
        () => new THREE.BoxGeometry(230, 230, 230),
        () => new THREE.ConeGeometry(180, 340, 5),
    ];

    const position = new THREE.Vector3();
    let placed = 0;
    let attempts = 0;

    // fewer floaters on a phone - each one is a mesh plus a wireframe pass
    const target = MOBILE ? 16 : 38;

    while (placed < target && attempts < 900) {
        attempts++;

        position.set(
            (Math.random() - 0.5) * 15000,
            -600 + Math.random() * 2300,
            2200 - Math.random() * 18800
        );

        if (!clearOfPanels(position, 2300)) continue;

        const group = wireSolid(shapes[placed % shapes.length](), {
            lineOpacity: 0.3 + Math.random() * 0.4,
            fillOpacity: 0.55,
        });

        group.position.copy(position);
        group.scale.setScalar(0.55 + Math.random() * 1.6);
        group.rotation.set(Math.random() * 6.283, Math.random() * 6.283, Math.random() * 6.283);
        scene.add(group);

        spinners.push({
            object: group,
            spin: new THREE.Vector3(
                (Math.random() - 0.5) * 0.34,
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.26
            ),
            baseY: position.y,
            bob: 70 + Math.random() * 170,
            rate: 0.09 + Math.random() * 0.22,
            phase: Math.random() * 6.283,
        });

        placed++;
    }
};

buildFloaters();

// --- gates: rings strung along the flight path, flown through ---
const buildGates = () => {
    const axis = new THREE.Vector3(0, 0, 1);
    const forward = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();

    for (let i = 0; i < panels.length - 1; i++) {
        const from = panels[i].anchor;
        const to = panels[i + 1].anchor;
        forward.copy(to).sub(from).normalize();
        quaternion.setFromUnitVectors(axis, forward);

        [0.36, 0.66].forEach((t, step) => {
            const gate = new THREE.Group();
            gate.position.copy(from).lerp(to, t);
            gate.quaternion.copy(quaternion);
            scene.add(gate);

            const outer = new THREE.Mesh(
                new THREE.TorusGeometry(980, 12, 5, 72),
                new THREE.MeshBasicMaterial({
                    color: ACCENT,
                    transparent: true,
                    opacity: 0.32,
                    fog: true,
                })
            );
            gate.add(outer);

            const inner = new THREE.Mesh(
                new THREE.TorusGeometry(720, 6, 4, 48),
                new THREE.MeshBasicMaterial({
                    color: ACCENT,
                    transparent: true,
                    opacity: 0.18,
                    fog: true,
                })
            );
            gate.add(inner);

            // markers riding the rim, so the rotation is readable
            const marker = new THREE.BoxGeometry(70, 70, 70);
            const markerMaterial = new THREE.MeshBasicMaterial({
                color: ACCENT,
                transparent: true,
                opacity: 0.55,
                fog: true,
            });

            for (let m = 0; m < 8; m++) {
                const angle = (m / 8) * Math.PI * 2;
                const cube = new THREE.Mesh(marker, markerMaterial);
                cube.position.set(Math.cos(angle) * 980, Math.sin(angle) * 980, 0);
                outer.add(cube);
            }

            const direction = step % 2 ? -1 : 1;
            spinners.push({ object: outer, spin: new THREE.Vector3(0, 0, 0.16 * direction) });
            spinners.push({ object: inner, spin: new THREE.Vector3(0, 0, -0.28 * direction) });
        });
    }
};

buildGates();

// --- each station gets a slow ring and a few orbiting shards ---
const buildStationRigs = () => {
    panels.forEach((panel, index) => {
        const rig = new THREE.Group();
        rig.position.copy(panel.center).addScaledVector(panel.normal, -1100);
        rig.quaternion.copy(panel.quat);
        scene.add(rig);

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(1650, 10, 5, 96),
            new THREE.MeshBasicMaterial({
                color: ACCENT,
                transparent: true,
                opacity: 0.16,
                fog: true,
            })
        );
        rig.add(ring);
        spinners.push({ object: ring, spin: new THREE.Vector3(0, 0, 0.05 * (index % 2 ? -1 : 1)) });

        // satellites: a pivot per shard, spun about the ring axis
        for (let s = 0; s < 3; s++) {
            const pivot = new THREE.Group();
            pivot.rotation.z = (s / 3) * Math.PI * 2;
            rig.add(pivot);

            const shard = wireSolid(
                s === 0
                    ? new THREE.OctahedronGeometry(140, 0)
                    : s === 1
                        ? new THREE.IcosahedronGeometry(120, 0)
                        : new THREE.BoxGeometry(170, 170, 170),
                { lineOpacity: 0.6, fillOpacity: 0.7 }
            );
            shard.position.set(1650, 0, (s - 1) * 260);
            pivot.add(shard);

            spinners.push({
                object: pivot,
                spin: new THREE.Vector3(0, 0, 0.09 + s * 0.03),
            });
            spinners.push({
                object: shard,
                spin: new THREE.Vector3(0.4, 0.32, 0.2),
            });
        }
    });
};

buildStationRigs();

// --- a signature piece: a big knot turning beside the home panel ---
const centrepiece = wireSolid(new THREE.TorusKnotGeometry(520, 120, 128, 12), {
    lineOpacity: 0.5,
    fillOpacity: 0.75,
    threshold: 24,
});
centrepiece.position.set(
    panels[0].center.x - 2600,
    panels[0].center.y + 260,
    panels[0].center.z + 900
);
scene.add(centrepiece);
spinners.push({
    object: centrepiece,
    spin: new THREE.Vector3(0.06, 0.14, 0.04),
    baseY: centrepiece.position.y,
    bob: 180,
    rate: 0.16,
    phase: 0,
});

// --- a pool of light on the floor under each panel ---
const poolGeometry = new THREE.PlaneGeometry(5200, 5200);
const poolMaterial = new THREE.MeshBasicMaterial({
    map: glowTexture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.16,
    fog: false,
});

panels.forEach(panel => {
    const pool = new THREE.Mesh(poolGeometry, poolMaterial);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(panel.center.x, -880, panel.center.z);
    scene.add(pool);

    const halo = new THREE.Mesh(new THREE.PlaneGeometry(4200, 3000), new THREE.MeshBasicMaterial({
        map: glowTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.1,
        fog: false,
    }));
    halo.position.copy(panel.center).addScaledVector(panel.normal, -400);
    halo.quaternion.copy(panel.quat);
    scene.add(halo);
});

// --- drifting dust ---
const buildDust = () => {
    // the dust field is the heaviest single draw, so it is halved on mobile
    const count = MOBILE ? 1100 : 2400;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 26000;
        positions[i * 3 + 1] = -1600 + Math.random() * 3600;
        positions[i * 3 + 2] = 3000 - Math.random() * 24000;
        seeds[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

    const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(0x9fe9ee) },
        },
        vertexShader: `
            attribute float aSeed;
            uniform float uTime;
            varying float vAlpha;
            void main() {
                vec3 p = position;
                p.y += sin(uTime * 0.12 + aSeed * 6.283) * 130.0 + uTime * 6.0;
                p.y = mod(p.y + 1600.0, 3600.0) - 1600.0;
                p.x += sin(uTime * 0.07 + aSeed * 3.1) * 90.0;

                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                float depth = max(-mv.z, 1.0);
                gl_PointSize = (2.0 + aSeed * 3.2) * (1100.0 / depth);
                gl_Position = projectionMatrix * mv;
                vAlpha = (1.0 - smoothstep(2500.0, 17000.0, depth)) * (0.18 + aSeed * 0.38);
            }
        `,
        fragmentShader: `
            uniform vec3 uColor;
            varying float vAlpha;
            void main() {
                float d = length(gl_PointCoord - 0.5);
                float mask = 1.0 - smoothstep(0.12, 0.5, d);
                if (mask <= 0.001) discard;
                gl_FragColor = vec4(uColor, mask * vAlpha);
            }
        `,
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);
    return material;
};

const dustMaterial = buildDust();

// ---------------------------------------------------
// camera flight
// ---------------------------------------------------
const basePosition = new THREE.Vector3();
const baseQuaternion = new THREE.Quaternion();

let current = 0;
let flight = null;

const flyTo = (index, duration = 1900) => {
    const target = panels[index];
    if (!target) return;

    current = index;
    updateRail();

    const from = basePosition.clone();
    const fromQuat = baseQuaternion.clone();
    const travel = target.anchor.clone().sub(from);
    const length = travel.length();

    // bow the path sideways and up a touch so it reads as flight, not a slide
    const arc = new THREE.Vector3();
    if (length > 1) {
        arc.copy(travel).normalize().cross(new THREE.Vector3(0, 1, 0))
            .multiplyScalar(length * 0.11)
            .add(new THREE.Vector3(0, length * 0.05, 0));
    }

    // bank into the turn
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(fromQuat);
    const bank = clamp(travel.dot(right) / Math.max(length, 1), -1, 1) * -0.1;

    flight = {
        from,
        fromQuat,
        to: target.anchor.clone(),
        toQuat: target.quat.clone(),
        arc,
        bank,
        start: performance.now(),
        duration: length < 1 ? 1 : duration,
    };
};

// start pulled back from the home panel and ease in
basePosition.copy(panels[0].anchor).addScaledVector(panels[0].normal, panels[0].fitDist * 1.6);
basePosition.y += 700;
baseQuaternion.copy(panels[0].quat);
camera.position.copy(basePosition);
camera.quaternion.copy(baseQuaternion);

// ---------------------------------------------------
// hud rail
// ---------------------------------------------------
const rail = document.createElement('nav');
rail.id = 'world-rail';
rail.setAttribute('aria-label', 'Section navigation');

panels.forEach((panel, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', panel.station.label);
    button.innerHTML = `<span>${panel.station.label}</span>`;
    button.addEventListener('click', () => goTo(index));
    rail.appendChild(button);
});

document.body.appendChild(rail);

function updateRail() {
    rail.querySelectorAll('button').forEach((button, index) => {
        button.classList.toggle('active', index === current);
    });
}

// keep the flat site's own state in sync so the navbar underline still works
function goTo(index) {
    const panel = panels[index];
    if (!panel) return;

    // don't leave a showreel playing to an empty room
    if (panel.station.id !== 'portfolio') {
        document.querySelectorAll('.portfolio-carousel video').forEach(video => video.pause());
    }

    flyTo(index);

    document.querySelectorAll('.navbar a').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${panel.station.id}`);
    });
    document.querySelectorAll('section').forEach(section => {
        section.classList.toggle('active', section.id === panel.station.id);
    });
}

updateRail();

// ---------------------------------------------------
// input
// ---------------------------------------------------
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

window.addEventListener('pointermove', event => {
    pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
});

// any in-page link flies the camera; script.js still toggles its own classes
document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    const id = link.getAttribute('href').slice(1);
    const index = panels.findIndex(panel => panel.station.id === id);
    if (index < 0) return;

    event.preventDefault();
    goTo(index);
});

window.addEventListener('keydown', event => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'PageDown') {
        goTo(Math.min(current + 1, panels.length - 1));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp') {
        goTo(Math.max(current - 1, 0));
    } else if (event.key === 'Home') {
        goTo(0);
    } else if (event.key === 'End') {
        goTo(panels.length - 1);
    }
});

// wheel travels between stations, unless the cursor is over
// something that still has room to scroll on its own
let wheelLock = 0;

window.addEventListener('wheel', event => {
    const scroller = event.target.closest('.resume-list');
    if (scroller) {
        const room = event.deltaY > 0
            ? scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop > 1
            : scroller.scrollTop > 1;
        if (room) return;
    }

    const now = performance.now();
    if (flight || now < wheelLock) return;
    if (Math.abs(event.deltaY) < 12) return;

    wheelLock = now + 320;
    goTo(clamp(current + (event.deltaY > 0 ? 1 : -1), 0, panels.length - 1));
}, { passive: true });

// ---------------------------------------------------
// swipe - the only way to travel on a touch screen
// ---------------------------------------------------
// A phone has no wheel and no arrow keys, so without this the rail dots
// are the only way between stations. Only *horizontal* swipes fly the
// camera; vertical is left alone so panel content can still be scrolled
// with a thumb.
if (COARSE) {
    let swipe = null;

    // the browser's own back/forward gesture starts at the very edge of the
    // screen, and people rely on it. Ignore touches that begin there and let
    // the browser have them, rather than trying to win a fight with it.
    const EDGE = 32;

    // set when a swipe actually moved the camera, so the click it leaves
    // behind can be cancelled
    let swipedAway = false;

    window.addEventListener('touchstart', event => {
        if (event.touches.length !== 1) return;

        const x = event.touches[0].clientX;
        if (x < EDGE || x > window.innerWidth - EDGE) {
            swipe = null;
            return;
        }

        // Only form controls are skipped - they handle their own touches.
        // Links and buttons deliberately do NOT block a swipe: the affiliates
        // panel is one big <a> and the portfolio panel is mostly carousel, so
        // excluding either left no way to swipe onward to contact. The stray
        // click a swipe leaves behind is cancelled further down instead.
        const target = event.target;
        if (target.closest('input, textarea, select')) {
            swipe = null;
            return;
        }

        swipe = { x, y: event.touches[0].clientY, done: false };
    }, { passive: true });

    // NOT passive: we have to be able to preventDefault. Chrome starts its
    // own back/forward navigation on a horizontal drag, and touch-action
    // alone does not reliably stop it - only cancelling the first sideways
    // touchmove does. The handler bails out immediately when there is no
    // swipe in progress, so the cost to ordinary scrolling is negligible.
    window.addEventListener('touchmove', event => {
        if (!swipe) return;

        const dx = event.touches[0].clientX - swipe.x;
        const dy = event.touches[0].clientY - swipe.y;

        // claim the gesture the moment it leans sideways, before the browser
        // can decide it owns it. vertical drags fall through untouched so
        // panel content still scrolls.
        if (Math.abs(dx) > Math.abs(dy) && event.cancelable) event.preventDefault();

        if (swipe.done || flight) return;

        // must be clearly sideways, not a scroll that drifted
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

        swipe.done = true;
        goTo(clamp(current + (dx < 0 ? 1 : -1), 0, panels.length - 1));
    }, { passive: false });

    // a swipe that started on a link or a card would otherwise finish as a
    // click on it - swallow that one click, so swiping never opens something
    window.addEventListener('click', event => {
        if (!swipedAway) return;
        swipedAway = false;
        event.preventDefault();
        event.stopPropagation();
    }, { capture: true });

    window.addEventListener('touchend', () => {
        swipedAway = !!(swipe && swipe.done);
        swipe = null;
    }, { passive: true });
}

// ---------------------------------------------------
// cards tilt toward the cursor, in every section
// ---------------------------------------------------
// getBoundingClientRect on a CSS3D-transformed card is not free, and
// pointermove outruns the display. Collapse a burst into one job per frame.
const perFrame = handler => {
    let queued = false;
    let x = 0;
    let y = 0;

    return event => {
        x = event.clientX;
        y = event.clientY;
        if (queued) return;

        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            handler(x, y);
        });
    };
};

const tiltCard = (card, strength) => {
    // no cursor to follow on a phone, so the listener is never attached
    if (COARSE) return;

    card.addEventListener('pointermove', perFrame((px, py) => {
        const rect = card.getBoundingClientRect();
        const nx = (px - rect.left) / rect.width - 0.5;
        const ny = (py - rect.top) / rect.height - 0.5;
        card.style.setProperty('--cry', `${nx * strength}deg`);
        card.style.setProperty('--crx', `${-ny * strength}deg`);
    }));

    card.addEventListener('pointerleave', () => {
        card.style.setProperty('--cry', '0deg');
        card.style.setProperty('--crx', '0deg');
    });
};

// services keep their staggered resting depth
// the cards used to rest at staggered depths, but with three rows a card
// that is both pushed forward and tilted overlaps its neighbour. They now
// sit level and only move on hover, which reads cleaner.
document.querySelectorAll('.services-box').forEach(card => {
    card.style.setProperty('--cz', '0px');
    tiltCard(card, 10);
});

document.querySelectorAll('.resume-item, .info-row, .affiliate-card').forEach(card => tiltCard(card, 11));
document.querySelectorAll('.resume-btn, .chip, .social-media a').forEach(card => tiltCard(card, 16));

// ---------------------------------------------------
// portfolio coverflow
// ---------------------------------------------------
const carouselItems = [...document.querySelectorAll('.portfolio-carousel .img-item')];
const portfolioDetails = [...document.querySelectorAll('.portfolio-detail')];

const activeSlide = () =>
    Math.max(0, portfolioDetails.findIndex(detail => detail.classList.contains('active')));

const layoutCoverflow = () => {
    const active = activeSlide();

    carouselItems.forEach((item, index) => {
        const offset = index - active;
        const distance = Math.abs(offset);
        const hidden = distance > 2;

        item.classList.toggle('is-front', offset === 0);

        // neighbours are pushed well clear of the front slide so nothing
        // overlaps the piece you are actually looking at
        item.style.transform = offset === 0
            ? 'translateX(0) translateZ(0) rotateY(0deg)'
            : `translateX(${offset * 62}%) translateZ(${-distance * 420}px) rotateY(${offset * -40}deg)`;
        item.style.opacity = hidden ? '0' : `${Math.max(0, 1 - distance * 0.45)}`;
        item.style.zIndex = `${10 - distance}`;
        item.style.visibility = hidden ? 'hidden' : 'visible';
    });
};

// script.js owns this, so the muted fallback and the "tap for sound" badge
// behave identically in both modes. the local version is only a safety net
// for the case where script.js has not finished running yet.
const playWithSound = video => {
    if (window.playWithSound) return window.playWithSound(video);

    video.muted = false;
    video.volume = 1;
    video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => { });
    });
};

// jump straight to a slide by clicking it, and keep script.js in step
const showSlide = index => {
    const target = clamp(index, 0, portfolioDetails.length - 1);
    if (target === activeSlide()) return;

    portfolioDetails.forEach((detail, i) => detail.classList.toggle('active', i === target));

    carouselItems.forEach((item, i) => {
        const video = item.querySelector('video');
        if (!video) return;

        video.pause();
        if (i === target) playWithSound(video);
    });
};

if (carouselItems.length) {
    layoutCoverflow();

    // script.js drives the carousel index through .portfolio-detail.active
    const observer = new MutationObserver(layoutCoverflow);
    portfolioDetails.forEach(detail => {
        observer.observe(detail, { attributes: true, attributeFilter: ['class'] });
    });

    carouselItems.forEach((item, index) => {
        item.addEventListener('click', event => {
            if (event.target.closest('video')) return;   // let the controls work
            showSlide(index);
        });
    });

    // drag sideways to spin the coverflow.
    // Mouse only. The carousel fills most of the portfolio panel, so on a
    // phone owning the horizontal axis here would trap the visitor: there
    // would be no way to swipe past portfolio to affiliates or contact.
    // Touch users change slides with the arrows or by tapping a slide.
    const carousel = document.querySelector('.portfolio-carousel');
    let drag = null;

    carousel.addEventListener('pointerdown', event => {
        if (COARSE) return;
        if (event.target.closest('video')) return;
        drag = { x: event.clientX, from: activeSlide() };
        carousel.setPointerCapture(event.pointerId);
    });

    carousel.addEventListener('pointermove', event => {
        if (!drag) return;

        showSlide(drag.from + Math.round((drag.x - event.clientX) / 140));
    });

    const endDrag = event => {
        if (!drag) return;
        if (carousel.hasPointerCapture(event.pointerId)) carousel.releasePointerCapture(event.pointerId);
        drag = null;
    };

    carousel.addEventListener('pointerup', endDrag);
    carousel.addEventListener('pointercancel', endDrag);
}

// ---------------------------------------------------
// resize
// ---------------------------------------------------
// resize fires continuously while a window is dragged, and measurePanels
// reads the layout of all six panels. Resize the canvases immediately so
// nothing looks stretched, but re-measure only once the dragging stops.
let resizeTimer = 0;

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.setSize(window.innerWidth, window.innerHeight);

    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        measurePanels();
        if (!flight) basePosition.copy(panels[current].anchor);
    }, 140);
});

// ---------------------------------------------------
// loop
// ---------------------------------------------------
const right = new THREE.Vector3();
const up = new THREE.Vector3();
const clock = new THREE.Clock();
let lastElapsed = 0;

const animate = () => {
    requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();
    const delta = Math.min(elapsed - lastElapsed, 0.1);
    lastElapsed = elapsed;

    // spin and bob every moving solid in the world
    for (const item of spinners) {
        item.object.rotation.x += item.spin.x * delta;
        item.object.rotation.y += item.spin.y * delta;
        item.object.rotation.z += item.spin.z * delta;

        if (item.bob) {
            item.object.position.y = item.baseY + Math.sin(elapsed * item.rate + item.phase) * item.bob;
        }
    }

    if (flight) {
        const raw = clamp((performance.now() - flight.start) / flight.duration, 0, 1);
        const t = easeInOut(raw);

        basePosition.lerpVectors(flight.from, flight.to, t)
            .addScaledVector(flight.arc, Math.sin(Math.PI * t));
        baseQuaternion.slerpQuaternions(flight.fromQuat, flight.toQuat, t);

        if (raw >= 1) flight = null;
    }

    // damped cursor parallax plus a slow idle drift
    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;

    right.set(1, 0, 0).applyQuaternion(baseQuaternion);
    up.set(0, 1, 0).applyQuaternion(baseQuaternion);

    camera.position.copy(basePosition)
        .addScaledVector(right, pointer.x * SWAY.x)
        .addScaledVector(up, -pointer.y * SWAY.y + Math.sin(elapsed * 0.4) * SWAY.idle);

    camera.quaternion.copy(baseQuaternion);
    camera.rotateY(-pointer.x * SWAY.yaw);
    camera.rotateX(pointer.y * SWAY.pitch);

    if (flight) {
        const t = easeInOut(clamp((performance.now() - flight.start) / flight.duration, 0, 1));
        camera.rotateZ(flight.bank * Math.sin(Math.PI * t));
    }

    // fade panels by distance and stop far ones from eating clicks.
    // the station you are parked at is always fully lit and always live -
    // deriving that from a distance threshold left panels dead whenever the
    // framing put them a hair further out than the cutoff expected
    panels.forEach((panel, index) => {
        const distance = camera.position.distanceTo(panel.center);
        const opacity = 1 - smoothstep(panel.fitDist * 1.15, panel.fitDist * 3.6, distance);
        const parked = index === current && !flight;

        panel.el.style.opacity = parked ? '1' : opacity.toFixed(3);
        panel.el.style.visibility = parked || opacity >= 0.02 ? 'visible' : 'hidden';
        panel.el.style.pointerEvents = parked ? 'auto' : 'none';
    });

    floorMaterial.uniforms.uCam.value.copy(camera.position);
    ceilingMaterial.uniforms.uCam.value.copy(camera.position);
    dustMaterial.uniforms.uTime.value = elapsed;

    renderer.render(scene, camera);
    cssRenderer.render(cssScene, camera);
};

animate();

// ---------------------------------------------------
// accent colour
// ---------------------------------------------------
// The picker in script.js rewrites --main-color and fires 'accentchange'.
// Everything in this scene that was built in the accent colour is collected
// once, up front, so recolouring is just a copy per material rather than a
// rebuild of the world.
const accentColours = [];

scene.traverse(object => {
    const materials = Array.isArray(object.material)
        ? object.material
        : object.material ? [object.material] : [];

    materials.forEach(material => {
        if (material.color && material.color.getHex() === ACCENT) accentColours.push(material.color);
        if (material.uniforms && material.uniforms.uColor) accentColours.push(material.uniforms.uColor.value);
    });
});

window.addEventListener('accentchange', event => {
    const next = new THREE.Color(event.detail);
    accentColours.forEach(colour => colour.copy(next));
});

// pick up a colour that was restored from localStorage before this module loaded
const startingAccent = getComputedStyle(document.documentElement)
    .getPropertyValue('--main-color').trim();

if (startingAccent) {
    const next = new THREE.Color(startingAccent);
    if (next.getHex() !== ACCENT) accentColours.forEach(colour => colour.copy(next));
}

// ease the world in, then settle onto the opening station
requestAnimationFrame(() => {
    document.documentElement.classList.add('world-ready');

    const hash = location.hash.slice(1);
    const start = Math.max(0, panels.findIndex(panel => panel.station.id === hash));

    if (start > 0) {
        // jump the camera to the previous station so the arrival still reads as flight
        basePosition.copy(panels[start].anchor).addScaledVector(panels[start].normal, panels[start].fitDist * 1.4);
        basePosition.y += 600;
        baseQuaternion.copy(panels[start].quat);
    }

    goTo(start);
    if (flight) flight.duration = 2600;
});
