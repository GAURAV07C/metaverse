export interface Prefab {
  title: string;
  kind: string;
  area: string;
  size: string;
  color: string;
  thumb?: string;
  items?: { kind: string; dx: number; dy: number }[];
}

export const prefabs: Prefab[] = [
  { title: 'Machine 1', kind: 'machine-1', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/0aab278b-c203-4298-9173-d18694b931a5.png' },
  { title: 'Machine 2', kind: 'machine-2', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/0b0292b4-c693-4b60-ac36-43e26e52fdfb.png' },
  { title: 'Machine 3', kind: 'machine-3', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/0b5df01c-734c-461b-ae75-e154f0739872.png' },
  { title: 'Machine 4', kind: 'machine-4', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/141ff980-26a2-49b9-8563-dc28a4548f69.png' },
  { title: 'Machine 5', kind: 'machine-5', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/2dce0124-523d-4fa0-9ec2-8d8617e24ca2.png' },
  { title: 'Machine 6', kind: 'machine-6', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/38f1e787-0cdd-4717-a233-1a844de8e5c1.png' },
  { title: 'Machine 7', kind: 'machine-7', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/3e34c470-4090-4c7a-85f7-a0ce41851ddd.png' },
  { title: 'Machine 8', kind: 'machine-8', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/4c2bc660-714a-4ed1-8be0-09d612ef52f7.png' },
  { title: 'Machine 9', kind: 'machine-9', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/526991e5-81c7-4f4f-be84-1e35e04b648b.png' },
  { title: 'Machine 10', kind: 'machine-10', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/5931c39c-2e12-48d4-b2b1-1169c5155d81.png' },
  { title: 'Machine 11', kind: 'machine-11', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/6ffdde7d-fe0f-41ac-82dc-6127306974da.png' },
  { title: 'Machine 12', kind: 'machine-12', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/712c2034-462f-4e36-a004-ee03d968c36b.png' },
  { title: 'Machine 13', kind: 'machine-13', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/80a16ce5-cc62-474c-8dc4-42c97f4e47c3.png' },
  { title: 'Machine 14', kind: 'machine-14', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/86e320b1-5524-4d41-8ef0-78ace09c6f4e.png' },
  { title: 'Machine 15', kind: 'machine-15', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/923df6db-5c50-4633-b85e-e160def7e589.png' },
  { title: 'Machine 16', kind: 'machine-16', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/9ff3ccd2-36cf-4240-963b-aa0690cf9684.png' },
  { title: 'Machine 17', kind: 'machine-17', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/a8275a67-7e17-47d3-9fdf-3e373ffc2b85.png' },
  { title: 'Machine 18', kind: 'machine-18', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/ad2118e4-5cb4-4d65-ba13-8a3c92118fdd.png' },
  { title: 'Machine 19', kind: 'machine-19', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/b1c0fd8a-e527-4812-842e-c71bf35851be.png' },
  { title: 'Machine 20', kind: 'machine-20', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/befb52f8-e8cd-4456-b2f4-5cea06e92603.png' },
  { title: 'Machine 21', kind: 'machine-21', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/c20e3e07-6a41-4306-9b4b-7cafffb06068.png' },
  { title: 'Machine 22', kind: 'machine-22', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/c31c809e-568f-4d65-82f4-555db6a0dd73.png' },
  { title: 'Machine 23', kind: 'machine-23', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/c39b4720-7f5f-4849-a278-c5e75c79653f.png' },
  { title: 'Machine 24', kind: 'machine-24', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/c579a61b-7d95-4e2d-828a-3824ac2db977.png' },
  { title: 'Machine 25', kind: 'machine-25', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/c8503126-21ca-4bc3-889e-5435c2364178.png' },
  { title: 'Machine 26', kind: 'machine-26', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/db242ded-6151-4d78-b52a-bf5bca6d33dc.png' },
  { title: 'Machine 27', kind: 'machine-27', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/e5849735-21da-4832-b56d-3608f4fa001a.png' },
  { title: 'Machine 28', kind: 'machine-28', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/ecef1f0c-8a7a-415a-9825-985af969a3a0.png' },
  { title: 'Machine 29', kind: 'machine-29', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/fbcc8ba4-8dbd-499e-a326-90983b61cbe9.png' },
];

import { Settings } from 'lucide-react';

export const categories = [
  { id: 'Machines', icon: Settings },
];

export function needsCapacity(area: string): boolean { return false; }
