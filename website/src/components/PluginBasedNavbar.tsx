import React from 'react';
import NavbarItem, { type Props as NavbarItemProps } from '@theme/NavbarItem';
import { useActivePlugin } from '@docusaurus/plugin-content-docs/client';

const courseItems: Record<string, NavbarItemProps[]> = {
  'tg11-math': [
    {  label: 'Mathematik', to: '/tg11/math', position: 'left' },
    {  label: 'Informatik',  to: '/tg11/info', position: 'left' },
    {  label: 'Grundsätze',  to: '/tg11/principles', position: 'left' },
  ],
  'tg11-info': [
    {  label: 'Mathematik', to: '/tg11/math', position: 'left' },
    {  label: 'Informatik',  to: '/tg11/info', position: 'left' },
    {  label: 'Grundsätze',  to: '/tg11/principles', position: 'left' },
  ],
  'tg11-principles': [
    {  label: 'Mathematik', to: '/tg11/math', position: 'left' },
    {  label: 'Informatik',  to: '/tg11/info', position: 'left' },
    {  label: 'Grundsätze',  to: '/tg11/principles', position: 'left' },
  ],
  'tg12-math': [
    {  label: 'Übersicht',  to: '/tg12/math',  position: 'left' },
    {  label: 'Grundsätze', to: '/tg12/principles', position: 'left' },
  ],
  'tg12-principles': [
    {  label: 'Übersicht',  to: '/tg12/math',  position: 'left' },
    {  label: 'Grundsätze', to: '/tg12/principles', position: 'left' },
  ],
};

export default function PluginBasedNavbar() {
  const active = useActivePlugin();
  const pluginId = active?.pluginId;
  const items = (pluginId && courseItems[pluginId]) || [];
  if (!items.length) return null;

  return (
    <>
      {items.map((it, i) => (
        <NavbarItem key={i} {...it} />
      ))}
    </>
  );
}