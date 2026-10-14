import React from 'react';
import { LOGO_SVG } from '../../shared/brand/logo-svg';

export default function Logo({ size = 28 }: { size?: number }) {
  return <span className="logo" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />;
}
