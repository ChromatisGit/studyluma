import NavbarItem, { type Props as NavbarItemProps } from '@theme/NavbarItem';
import { useLocation } from '@docusaurus/router';
import NAVBAR_JSON from '@generated-configs/navbar.config.json';

export type NavbarConfig = Record<string, NavbarItemProps[]>;

const NAVBAR = NAVBAR_JSON as NavbarConfig

export default function GroupBasedNavbar() {
  const { pathname } = useLocation();
  const group = pathname.split('/')[1];
  const items = (group && NAVBAR[group]) || [];
  if (!items) return null;

  return (
    <>
      {items.map((it, i) => (
        <NavbarItem key={i} {...it} />
      ))}
    </>
  );
}
