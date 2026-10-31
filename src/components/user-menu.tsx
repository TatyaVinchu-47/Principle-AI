"use client";

import Link from "next/link";
import { LogOut, UserRound, SlidersHorizontal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";
import { signout } from "@/app/(auth)/actions";

export function UserMenu({ name, email }: { name: string | null; email: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        <Avatar>
          <AvatarFallback>{initials(name ?? email)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate">{name ?? "Student"}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound className="h-4 w-4" /> Profile & resume
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/preferences">
            <SlidersHorizontal className="h-4 w-4" /> Preferences
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signout}>
          <button type="submit" className="w-full">
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" /> Log out
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
