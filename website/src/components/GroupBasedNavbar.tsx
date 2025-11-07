import React from 'react';
import NavbarItem, { type Props as NavbarItemProps } from '@theme/NavbarItem';
import {useLocation} from '@docusaurus/router';
import NAVBAR_JSON from '../../.generated/navbar.config.json';

const NAVBAR = NAVBAR_JSON as Record<string, NavbarItemProps[]>;

export default function GroupBasedNavbar() {
  const {pathname} = useLocation();
  const group = pathname.split('/')[1];
  const items = (group && NAVBAR[group]) || [];
  if (!items.length) return null;

  return (
    <>
      {items.map((it, i) => (
        <NavbarItem key={i} {...it} />
      ))}
    </>
  );
}