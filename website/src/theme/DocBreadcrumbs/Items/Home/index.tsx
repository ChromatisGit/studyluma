import React, { type ReactNode } from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { useLocation } from '@docusaurus/router';
import { translate } from '@docusaurus/Translate';
import IconHome from '@theme/Icon/Home';

import styles from './styles.module.css';


// Modifies home button to lead to the roadmap of the course
export default function HomeBreadcrumbItem(): ReactNode {
  const { pathname } = useLocation();

  const sectionRoot = (() => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 2) return `/${parts.slice(0, 2).join('/')}/`;
    return '/';
  })();

  const homeHref = useBaseUrl(sectionRoot);

  return (
    <li className="breadcrumbs__item">
      <Link
        aria-label={translate({
          id: 'theme.docs.breadcrumbs.home',
          message: 'Kursseite',
          description:
            'Zurück zur Kursseite',
        })}
        className="breadcrumbs__link"
        href={homeHref}
      >
        <IconHome className={styles.breadcrumbHomeIcon} />
      </Link>
    </li>
  );
}