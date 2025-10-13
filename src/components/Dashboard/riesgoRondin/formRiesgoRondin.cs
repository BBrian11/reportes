/* pills de estado (si las usás fuera de MUI Chip) */
.estado-pill{
  display:inline-flex; align-items:center; gap:.4rem;
  padding:.28rem .6rem; border-radius:999px; cursor:pointer;
  border:1px solid rgba(2,6,23,.08); font-size:.85rem;
  transition:all .15s ease;
}
.estado-pill .dot{ width:.5rem; height:.5rem; border-radius:999px; background:var(--mui-palette-divider,#cbd5e1); }
.estado-pill.active{ border-color: var(--pill); background: color-mix(in srgb, var(--pill) 12%, #fff); }
.estado-pill.active .dot{ background: var(--pill); }
.estado-pill:hover{ background-color: rgba(148,163,184,.12); }
