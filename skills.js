// ===================================================
// SKILL LOGOS
// Real three.js geometry, not CSS boxes: each logo is an
// extruded shape with a bevelled edge, lit and spinning on
// its own axis. Runs in both flat and 3D mode.
// ===================================================

import * as THREE from 'three';

const canvas = document.getElementById('skills-canvas');
if (canvas) {

    // ---------------------------------------------------
    // shapes
    // ---------------------------------------------------
    const shield = () => {
        const s = new THREE.Shape();
        s.moveTo(-0.80, 0.96);
        s.lineTo(0.80, 0.96);
        s.lineTo(0.62, -0.52);
        s.lineTo(0, -0.98);
        s.lineTo(-0.62, -0.52);
        s.closePath();
        return s;
    };

    const roundedSquare = (r = 0.26) => {
        const s = new THREE.Shape();
        const a = 0.9;
        s.moveTo(-a + r, -a);
        s.lineTo(a - r, -a);
        s.quadraticCurveTo(a, -a, a, -a + r);
        s.lineTo(a, a - r);
        s.quadraticCurveTo(a, a, a - r, a);
        s.lineTo(-a + r, a);
        s.quadraticCurveTo(-a, a, -a, a - r);
        s.lineTo(-a, -a + r);
        s.quadraticCurveTo(-a, -a, -a + r, -a);
        return s;
    };

    const triangle = () => {
        const s = new THREE.Shape();
        s.moveTo(0, 0.95);
        s.lineTo(0.92, -0.72);
        s.lineTo(-0.92, -0.72);
        s.closePath();
        return s;
    };

    const hexagon = () => {
        const s = new THREE.Shape();
        for (let i = 0; i < 6; i++) {
            const a = Math.PI / 6 + (i * Math.PI) / 3;
            const x = Math.cos(a) * 0.95;
            const y = Math.sin(a) * 0.95;
            i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
        }
        s.closePath();
        return s;
    };

    // ---------------------------------------------------
    // face artwork, painted to a canvas and mapped onto the
    // flat faces of the extrusion
    // ---------------------------------------------------
    const faceTexture = (tint, draw) => {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const ctx = c.getContext('2d');

        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, 256, 256);

        ctx.fillStyle = '#0b0d10';
        ctx.strokeStyle = '#0b0d10';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        draw(ctx);

        const texture = new THREE.CanvasTexture(c);
        texture.colorSpace = THREE.SRGBColorSpace;
        // ExtrudeGeometry uses vertex x/y as UVs, and the shapes span -1..1
        texture.repeat.set(0.5, 0.5);
        texture.offset.set(0.5, 0.5);
        return texture;
    };

    const letters = (text, size = 104, y = 150) => ctx => {
        ctx.font = `700 ${size}px Poppins, Segoe UI, sans-serif`;
        ctx.fillText(text, 128, y);
    };

    const innerTriangle = ctx => {
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.moveTo(128, 96);
        ctx.lineTo(180, 186);
        ctx.lineTo(76, 186);
        ctx.closePath();
        ctx.stroke();
    };

    // ---------------------------------------------------
    // the line-up - order matches the labels in the markup
    // ---------------------------------------------------
    const SKILLS = [
        { shape: shield, tint: '#e34f26', draw: letters('5', 96, 158), spin: 0.55 },
        { shape: shield, tint: '#2196f3', draw: letters('3', 96, 158), spin: -0.48 },
        { shape: roundedSquare, tint: '#f7df1e', draw: letters('JS', 96, 142), spin: 0.62 },
        { shape: triangle, tint: '#01f0f8', draw: innerTriangle, spin: -0.58 },
        { shape: hexagon, tint: '#68a063', draw: letters('N', 104, 132), spin: 0.5 },
        { shape: roundedSquare, tint: '#31a8ff', draw: letters('Ps', 92, 138), spin: -0.66 },
        { shape: roundedSquare, tint: '#ff9a00', draw: letters('Ai', 92, 138), spin: 0.53 },
        { shape: roundedSquare, tint: '#9999ff', draw: letters('Ae', 88, 138), spin: -0.6 },
    ];

    // ---------------------------------------------------
    // scene
    // ---------------------------------------------------
    const scene = new THREE.Scene();

    // orthographic keeps every logo the same size across the row
    const VIEW_HEIGHT = 2.5;
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    camera.position.set(0, 0, 10);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene.add(new THREE.AmbientLight(0xffffff, 1.15));

    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(2, 3, 6);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x9fe9ee, 1.5);
    rim.position.set(-3, -1, 4);
    scene.add(rim);

    const DEPTH = 0.36;

    // ExtrudeGeometry runs one UV hook for both caps, so the back face would
    // come out mirrored - letters reading backwards. Tell them apart by z and
    // flip u on the far one.
    const uvGenerator = {
        generateTopUV(geometry, vertices, a, b, c) {
            const flip = vertices[a * 3 + 2] < DEPTH / 2 ? -1 : 1;
            return [a, b, c].map(i => new THREE.Vector2(vertices[i * 3] * flip, vertices[i * 3 + 1]));
        },
        generateSideWallUV() {
            return [new THREE.Vector2(0, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1, 1), new THREE.Vector2(0, 1)];
        },
    };

    const extrude = {
        depth: DEPTH,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.05,
        bevelSegments: 2,
        curveSegments: 18,
        UVGenerator: uvGenerator,
    };

    const logos = SKILLS.map(skill => {
        const geometry = new THREE.ExtrudeGeometry(skill.shape(), extrude);
        geometry.translate(0, 0, -DEPTH / 2);

        const face = new THREE.MeshStandardMaterial({
            map: faceTexture(skill.tint, skill.draw),
            metalness: 0.25,
            roughness: 0.45,
        });

        const side = new THREE.MeshStandardMaterial({
            color: new THREE.Color(skill.tint).multiplyScalar(0.72),
            metalness: 0.65,
            roughness: 0.3,
        });

        const mesh = new THREE.Mesh(geometry, [face, side]);
        mesh.rotation.x = -0.14;
        scene.add(mesh);

        return { mesh, spin: skill.spin, phase: Math.random() * Math.PI * 2 };
    });

    // ---------------------------------------------------
    // layout - spread the row across whatever width we get
    // ---------------------------------------------------
    const layout = () => {
        const width = canvas.clientWidth || 1;
        const height = canvas.clientHeight || 1;
        const aspect = width / height;
        const viewWidth = VIEW_HEIGHT * aspect;

        camera.left = -viewWidth / 2;
        camera.right = viewWidth / 2;
        camera.top = VIEW_HEIGHT / 2;
        camera.bottom = -VIEW_HEIGHT / 2;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height, false);

        const step = viewWidth / logos.length;
        const scale = Math.min(step * 0.42, VIEW_HEIGHT * 0.42);

        logos.forEach((logo, index) => {
            logo.mesh.position.x = (index - (logos.length - 1) / 2) * step;
            logo.mesh.scale.setScalar(scale);
        });
    };

    layout();
    new ResizeObserver(layout).observe(canvas);

    // ---------------------------------------------------
    // loop - idle while the Skills tab is closed
    // ---------------------------------------------------
    const clock = new THREE.Clock();

    const animate = () => {
        requestAnimationFrame(animate);

        const elapsed = clock.getElapsedTime();
        // offsetParent is null while the tab is display:none
        if (!canvas.offsetParent) return;
        if (canvas.clientWidth && canvas.width !== Math.round(canvas.clientWidth * renderer.getPixelRatio())) layout();

        for (const logo of logos) {
            logo.mesh.rotation.y = elapsed * logo.spin + logo.phase;
            logo.mesh.rotation.x = -0.14 + Math.sin(elapsed * 0.6 + logo.phase) * 0.08;
        }

        renderer.render(scene, camera);
    };

    animate();
}
