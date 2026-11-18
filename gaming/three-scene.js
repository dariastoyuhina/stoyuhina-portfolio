import * as THREE from "three";

const canvas = document.getElementById("fx");
if (!canvas) {
  // no-op
} else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  canvas.remove();
} else {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 8;

  const group = new THREE.Group();
  scene.add(group);

  const palette = [0xd18e9f, 0xc45c7a, 0xf7efe4, 0x4b3621, 0xe8c4cf];
  const geometries = [
    new THREE.BoxGeometry(0.45, 0.45, 0.45),
    new THREE.OctahedronGeometry(0.35),
    new THREE.TetrahedronGeometry(0.38),
  ];

  for (let i = 0; i < 28; i++) {
    const geo = geometries[i % geometries.length];
    const mat = new THREE.MeshStandardMaterial({
      color: palette[i % palette.length],
      roughness: 0.55,
      metalness: 0.08,
      transparent: true,
      opacity: 0.7,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 4 - 1
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    mesh.userData = {
      speed: 0.2 + Math.random() * 0.5,
      drift: 0.15 + Math.random() * 0.35,
      phase: Math.random() * Math.PI * 2,
    };
    group.add(mesh);
  }

  const light = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(light);
  const dir = new THREE.DirectionalLight(0xffe8ef, 0.9);
  dir.position.set(3, 4, 6);
  scene.add(dir);

  let mx = 0;
  let my = 0;
  window.addEventListener(
    "pointermove",
    (e) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    },
    { passive: true }
  );

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  const clock = new THREE.Clock();
  function animate() {
    const t = clock.getElapsedTime();
    group.children.forEach((mesh, i) => {
      const { speed, drift, phase } = mesh.userData;
      mesh.rotation.x += 0.004 * speed;
      mesh.rotation.y += 0.006 * speed;
      mesh.position.y += Math.sin(t * drift + phase) * 0.002;
      mesh.position.x += Math.cos(t * drift * 0.7 + i) * 0.0015;
    });
    group.rotation.y = mx * 0.18;
    group.rotation.x = my * 0.1;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
}
