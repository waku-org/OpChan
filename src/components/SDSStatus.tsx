import React from 'react';
import { Badge } from "@/components/ui/badge";

export const SDSStatus: React.FC = () => {
  return (
    <Badge variant="outline" className="text-xs">
      SDS: Active (Votes)
    </Badge>
  );
};