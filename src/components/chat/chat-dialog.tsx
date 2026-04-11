'use client';
import React from 'react';
export function ChatDialog({ trigger }: any) {
  return (
    <>
      {trigger || <button>Chat</button>}
    </>
  );
}
