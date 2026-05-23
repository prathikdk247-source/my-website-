import React from "react";
import { Leaf } from "lucide-react";

export const Brand = ({ small = false }) => (
  <div className="brandbar" data-testid="brand-logo">
    <span className="dot"><Leaf size={16} /></span>
    <span className="font-display" style={{ fontSize: small ? 18 : 22, color: "var(--ac-green-900)" }}>
      AgroConnect
    </span>
  </div>
);

export default Brand;
