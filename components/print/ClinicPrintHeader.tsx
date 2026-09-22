'use client';

import React from 'react';

interface ClinicPrintHeaderProps {
  compact?: boolean;
}

const Logo = () => (
  <svg width="50" height="50" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    {/* Red Cross */}
    <rect x="40" y="20" width="20" height="60" fill="#D42A3A" />
    <rect x="20" y="40" width="60" height="20" fill="#D42A3A" />
    {/* Blue Wave/Swoosh */}
    <path d="M10 80 Q 50 60 90 80" stroke="#1E2A78" strokeWidth="8" fill="none" strokeLinecap="round" />
  </svg>
);

export function ClinicPrintHeader({ compact = false }: ClinicPrintHeaderProps) {
  return (
    <div className="clinic-print-header" style={{ 
      display: 'block', 
      width: '100%', 
      maxWidth: '180mm', 
      margin: '0 auto',
      fontFamily: 'Inter, Arial, sans-serif',
      color: '#1E2A78'
    }}>
      <div className="cph-left" style={{ display: 'flex', gap: '15px', alignItems: 'start' }}>
        <Logo />
        <div className="cph-title-block" style={{ flex: 1 }}>
          <h1 style={{ 
            fontSize: compact ? '18pt' : '24pt', 
            fontWeight: 'bold', 
            margin: 0, 
            lineHeight: 1,
            fontFamily: 'Georgia, "Times New Roman", serif' 
          }}>
            METRO DENTAL CLINIC
          </h1>
          <p style={{ 
            fontSize: '10pt', 
            margin: '2px 0 10px 0', 
            color: '#555', 
            fontStyle: 'italic' 
          }}>
            (Dental Implant & Root Canal Treatment Centre)
          </p>
          
          <div className="cph-branches" style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr auto 1fr', 
            gap: '20px',
            alignItems: 'center'
          }}>
            <div className="cph-branch" style={{ fontSize: '8pt', lineHeight: '1.3' }}>
              <span style={{ 
                display: 'block', 
                fontWeight: 'bold', 
                color: 'white', 
                backgroundColor: '#1E2A78', 
                padding: '2px 6px', 
                borderRadius: '3px',
                marginBottom: '4px',
                width: 'fit-content'
              }}>MYLAPORE</span>
              <p style={{ margin: 0 }}>No. 127, Kutchery Road, Chennai - 04.</p>
              <p style={{ margin: 0 }}>Near E-1 Mylapore Police Station, Bus Stop</p>
              <p style={{ margin: 0, fontWeight: 'bold' }}>☎ 91766 24722</p>
            </div>
            
            <div className="cph-badge" style={{ 
              textAlign: 'center', 
              border: '2px solid #1E2A78', 
              borderRadius: '50%', 
              width: '70px', 
              height: '70px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '7pt', 
              fontWeight: 'bold', 
              lineHeight: '1.1',
              padding: '5px'
            }}>
              22 Years of<br/>Dental Service
            </div>
            
            <div className="cph-branch" style={{ fontSize: '8pt', lineHeight: '1.3', textAlign: 'right' }}>
              <span style={{ 
                display: 'block', 
                fontWeight: 'bold', 
                color: 'white', 
                backgroundColor: '#1E2A78', 
                padding: '2px 6px', 
                borderRadius: '3px',
                marginBottom: '4px',
                width: 'fit-content',
                marginLeft: 'auto'
              }}>KODAMBAKKAM</span>
              <p style={{ margin: 0 }}>A-2, Metro Flats, No. 16/8, Vellalar Street,</p>
              <p style={{ margin: 0 }}>Chennai - 24. (Near Best Hospital)</p>
              <p style={{ margin: 0, fontWeight: 'bold' }}>☎ 91768 24722</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}