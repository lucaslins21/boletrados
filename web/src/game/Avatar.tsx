import { useState } from 'react';
import type React from 'react';
import { initials } from '../online/format';

type AvatarUser = { display_name: string; avatar_url?: string | null };

/**
 * Avatar do jogador: foto da conta Google quando houver, iniciais como reserva
 * (sem foto, ou se a imagem não carregar). `no-referrer` porque o servidor de fotos
 * do Google recusa algumas requisições com Referer de outro site.
 */
export function Avatar({ user, className, style }: { user: AvatarUser | null | undefined; className: string; style?: React.CSSProperties }) {
  const [failed, setFailed] = useState(false);
  const url = user?.avatar_url && !failed ? user.avatar_url : null;
  return <span className={`${className} avatar${url ? ' avatar--photo' : ''}`} style={style} aria-hidden="true">
    {url
      ? <img src={url} alt="" referrerPolicy="no-referrer" loading="lazy" decoding="async" onError={() => setFailed(true)}/>
      : initials(user?.display_name ?? '?')}
  </span>;
}
