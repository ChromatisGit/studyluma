'use client';

import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import CONTENTPAGE_TEXT from '@features/contentpage/contentpage.de.json';
import MACROS_TEXT from '@macros/macros.de.json';
import styles from './WorksheetPdfCard.module.css';

interface WorksheetPdfCardProps {
  pdfUrl?: string | undefined;
  pdfFileName?: string | undefined;
}

export function WorksheetPdfCard({ pdfUrl, pdfFileName }: WorksheetPdfCardProps) {
  const [isIos, setIsIos] = useState(false);
  const text = CONTENTPAGE_TEXT.worksheetPdfCard;

  useEffect(() => {
    setIsIos(/iPad|iPhone/.test(navigator.userAgent));
  }, []);

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>{text.title}</h2>
      <p className={styles.description}>{text.description}</p>
      <PdfAction pdfUrl={pdfUrl} pdfFileName={pdfFileName} isIos={isIos} />
    </div>
  );
}

function PdfAction({
  pdfUrl,
  pdfFileName,
  isIos,
}: {
  pdfUrl?: string | undefined;
  pdfFileName?: string | undefined;
  isIos: boolean;
}) {
  if (!pdfUrl) {
    return (
      <div className={styles.pdfButton}>
        <FileText className={styles.pdfButtonIcon} aria-hidden />
        {MACROS_TEXT.handwrittenTask.downloadPdf}
      </div>
    );
  }

  const goodnotesUrl = `goodnotes://open?url=${encodeURIComponent(pdfUrl)}`;

  return isIos ? (
    <a href={goodnotesUrl} className={styles.pdfButtonActive}>
      <FileText className={styles.pdfButtonIcon} aria-hidden />
      {MACROS_TEXT.handwrittenTask.openInGoodnotes}
    </a>
  ) : (
    <a href={pdfUrl} download={pdfFileName} className={styles.pdfButtonActive}>
      <FileText className={styles.pdfButtonIcon} aria-hidden />
      {MACROS_TEXT.handwrittenTask.downloadPdf}
    </a>
  );
}
