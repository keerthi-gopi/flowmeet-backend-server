"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Particle system for the landing page hero
function Particles({ count = 200 }: { count?: number }) {
    const meshRef = useRef<THREE.Points>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
    }, []);

    const actualCount = isMobile ? Math.floor(count / 3) : count;

    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(actualCount * 3);
        const colors = new Float32Array(actualCount * 3);
        const primary = new THREE.Color("#6366F1");
        const accent = new THREE.Color("#22D3EE");

        for (let i = 0; i < actualCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 20;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

            const color = Math.random() > 0.5 ? primary : accent;
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        return geo;
    }, [actualCount]);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.03;
            meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
        }
    });

    return (
        <points ref={meshRef} geometry={geometry}>
            <pointsMaterial
                size={0.08}
                vertexColors
                transparent
                opacity={0.7}
                sizeAttenuation
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

// Floating connection lines
function ConnectionLines() {
    const lineRef = useRef<THREE.LineSegments>(null);

    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(60 * 3);
        for (let i = 0; i < 60; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 15;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
        }
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        return geo;
    }, []);

    useFrame((state) => {
        if (lineRef.current) {
            lineRef.current.rotation.y = state.clock.getElapsedTime() * 0.02;
        }
    });

    return (
        <lineSegments ref={lineRef} geometry={geometry}>
            <lineBasicMaterial color="#6366F1" transparent opacity={0.1} />
        </lineSegments>
    );
}

export default function ParticleField() {
    const [isReduced, setIsReduced] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
        setIsReduced(mql.matches);
    }, []);

    if (isReduced) {
        // CSS-only fallback for reduced motion
        return (
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "radial-gradient(ellipse at 30% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, rgba(34, 211, 238, 0.1) 0%, transparent 50%)",
                }}
            />
        );
    }

    return (
        <div className="absolute inset-0 opacity-60" aria-hidden="true">
            <Canvas camera={{ position: [0, 0, 8], fov: 60 }} dpr={[1, 1.5]}>
                <ambientLight intensity={0.5} />
                <Particles count={250} />
                <ConnectionLines />
            </Canvas>
        </div>
    );
}
