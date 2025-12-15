import { Canvas, useFrame, useGraph } from '@react-three/fiber'
import { Environment, useGLTF, Html, useProgress } from '@react-three/drei'
import { useRef, useEffect, useMemo, Suspense } from 'react'
import * as THREE from 'three'
import styles from "./Avatar.module.css";

// Standard Ready Player Me Avatar
const AVATAR_URL = "https://models.readyplayer.me/69407980e37c2412efd1e8f8.glb";

// Preload the model
useGLTF.preload(AVATAR_URL)

function Loader() {
  const { progress } = useProgress()
  return <Html center><div style={{ color: 'black' }}>{progress.toFixed(0)}% loaded</div></Html>
}

function Human({ volume }: { volume: number }) {
  const { scene } = useGLTF(AVATAR_URL, true)

  const headMeshRef = useRef<THREE.Mesh | null>(null)
  const jawBoneRef = useRef<THREE.Bone | null>(null)
  const headBoneRef = useRef<THREE.Bone | null>(null)
  const neckBoneRef = useRef<THREE.Bone | null>(null)
  const leftEyeBoneRef = useRef<THREE.Bone | null>(null)
  const rightEyeBoneRef = useRef<THREE.Bone | null>(null)
  const spineBoneRef = useRef<THREE.Bone | null>(null) // For breathing

  const blinkRef = useRef({ isClosed: false, nextBlinkTime: 0 })
  const lastEyeMoveTime = useRef(0)
  const targetEyeRotation = useRef({ x: 0, y: 0 })

  useEffect(() => {
    // Bigger Scale & Position Adjustment
    scene.position.set(0, -2.1, 0) // Lowered to keep head centered after scaling up
    scene.rotation.set(0, 0, 0)
    scene.scale.set(1.25, 1.25, 1.25) // 1.25x Scale for "Bigger" look

    scene.traverse((obj) => {
      if (obj instanceof THREE.Bone) {
        if (obj.name.includes('Jaw')) jawBoneRef.current = obj
        if (obj.name.includes('Head')) headBoneRef.current = obj
        if (obj.name.includes('Neck')) neckBoneRef.current = obj
        if (obj.name.includes('Spine')) spineBoneRef.current = obj
        if (obj.name.includes('LeftEye') || obj.name === 'LeftEye') leftEyeBoneRef.current = obj
        if (obj.name.includes('RightEye') || obj.name === 'RightEye') rightEyeBoneRef.current = obj
      }
      if (obj instanceof THREE.Mesh) {
        if (obj.name.includes('Head') || obj.name.includes('Wolf3D_Head')) {
          headMeshRef.current = obj
        }
      }
    })
  }, [scene])

  useFrame((state) => {
    const time = state.clock.elapsedTime

    // 1. Organic Idle & Breathing
    // Breathing: Subtle lift in spine or whole model
    const breath = Math.sin(time * 0.8) * 0.005
    scene.position.y = -2.1 + breath

    // Composite Head Sway (Perlin-like layering)
    // Slower, deeper sway for realism
    const headRotX = Math.sin(time * 0.4) * 0.03 + Math.sin(time * 0.1) * 0.02
    const headRotY = Math.sin(time * 0.25) * 0.04 + Math.cos(time * 0.6) * 0.03

    if (headBoneRef.current) {
      // Using damp for buttery smooth movement
      headBoneRef.current.rotation.y = THREE.MathUtils.lerp(headBoneRef.current.rotation.y, headRotY, 0.05)
      headBoneRef.current.rotation.x = THREE.MathUtils.lerp(headBoneRef.current.rotation.x, headRotX, 0.05)
    }
    if (neckBoneRef.current) {
      neckBoneRef.current.rotation.y = THREE.MathUtils.lerp(neckBoneRef.current.rotation.y, headRotY * 0.4, 0.05)
    }

    // 2. Micro-Eye Movements
    if (time > lastEyeMoveTime.current + 1.5 + Math.random() * 3) {
      lastEyeMoveTime.current = time
      targetEyeRotation.current = {
        x: (Math.random() - 0.5) * 0.15,
        y: (Math.random() - 0.5) * 0.3
      }
    }

    [leftEyeBoneRef.current, rightEyeBoneRef.current].forEach(eye => {
      if (eye) {
        eye.rotation.x = THREE.MathUtils.lerp(eye.rotation.x, targetEyeRotation.current.x, 0.1)
        eye.rotation.y = THREE.MathUtils.lerp(eye.rotation.y, targetEyeRotation.current.y, 0.1)
      }
    })

    // 3. Lip Sync (Enhanced Power Curve)
    const adjustedVol = Math.pow(Math.min(volume * 12, 1), 1.5) // Steeper curve for "snappier" talk
    let morphed = false

    if (headMeshRef.current && headMeshRef.current.morphTargetInfluences && headMeshRef.current.morphTargetDictionary) {
      const visemeAA = headMeshRef.current.morphTargetDictionary['viseme_aa']
      const mouthOpen = headMeshRef.current.morphTargetDictionary['mouthOpen']

      const index = visemeAA ?? mouthOpen
      if (index !== undefined) {
        headMeshRef.current.morphTargetInfluences[index] = THREE.MathUtils.lerp(
          headMeshRef.current.morphTargetInfluences[index],
          adjustedVol,
          0.5 // Responsive
        )
        morphed = true
      }
    }

    if (!morphed && jawBoneRef.current) {
      const targetRot = 0.6 * adjustedVol // Big opening
      jawBoneRef.current.rotation.x = THREE.MathUtils.lerp(jawBoneRef.current.rotation.x, targetRot, 0.3)
    }

    // 4. Blinking (Double Blink Logic)
    if (time > blinkRef.current.nextBlinkTime) {
      blinkRef.current.isClosed = true
      blinkRef.current.nextBlinkTime = time + 3 + Math.random() * 5
      setTimeout(() => {
        blinkRef.current.isClosed = false
        if (Math.random() > 0.6) { // 40% chance of double blink
          setTimeout(() => { blinkRef.current.isClosed = true }, 80)
          setTimeout(() => { blinkRef.current.isClosed = false }, 200)
        }
      }, 120)
    }

    const blinkValue = blinkRef.current.isClosed ? 1 : 0
    if (headMeshRef.current?.morphTargetInfluences && headMeshRef.current.morphTargetDictionary) {
      const leftIndex = headMeshRef.current.morphTargetDictionary['eyeBlinkLeft']
      const rightIndex = headMeshRef.current.morphTargetDictionary['eyeBlinkRight']
      if (leftIndex !== undefined && rightIndex !== undefined) {
        const val = THREE.MathUtils.lerp(headMeshRef.current.morphTargetInfluences[leftIndex], blinkValue, 0.5)
        headMeshRef.current.morphTargetInfluences[leftIndex] = val
        headMeshRef.current.morphTargetInfluences[rightIndex] = val
      }
    }
  })

  return <primitive object={scene} />
}

export default function Avatar3D({ volume }: { volume: number }) {
  return (
    <div className={styles.avatarContainer}>
      <Canvas
        camera={{ position: [0, 0.2, 0.7], fov: 40 }} // Zoomed in slightly (lower FOV) for cinematic look
        style={{ width: "100%", height: "100%" }}
        onCreated={() => console.log("Canvas created")}
      >
        {/* Soft, warm studio lighting for realism */}
        <ambientLight intensity={0.7} />
        <spotLight position={[5, 10, 5]} angle={0.5} penumbra={1} intensity={1} shadow-bias={-0.0001} />
        <pointLight position={[-5, 0, 5]} intensity={0.5} color="#ffdca8" /> {/* Warm rim light */}
        <Environment preset="apartment" /> {/* Warmer indoor lighting */}

        <Suspense fallback={<Loader />}>
          <Human volume={volume} />
        </Suspense>
      </Canvas>
    </div>
  );
}
