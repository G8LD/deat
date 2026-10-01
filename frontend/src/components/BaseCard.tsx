import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import React from "react";

interface BaseCardProps {
  link: string;
  children: React.ReactNode;
  className?: string
}

export default function BaseCard({ link, children, className="" }: BaseCardProps) {
  return (
    <Link to={link}>
      <Card className={`w-36 lg:w-48 aspect-2/3 p-0 gap-0 h-full overflow-hidden ${className}`}>{children}</Card>
    </Link>
  );
}
