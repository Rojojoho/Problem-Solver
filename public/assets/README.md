Drop images/logos/icons here. Anything in this folder is served directly
at `/assets/<filename>` (e.g. `public/assets/logo.png` → `/assets/logo.png`),
so you can reference it in code with:

```tsx
<img src="/assets/logo.png" alt="..." />
```

or with Next's `Image` component:

```tsx
import Image from "next/image";
<Image src="/assets/logo.png" width={32} height={32} alt="..." />
```
