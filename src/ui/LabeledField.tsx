import './LabeledField.css';

import React from 'react';

interface Props {
  label: string;
  children: React.ReactNode;
}

export const LabeledField = ({ label, children }: Props) => {
  return (
    <div className="LabeledField">
      <div className="Label">{label}</div>
      <div className="Field">{children}</div>
    </div>
  );
};
