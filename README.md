# ⚛️ React Feature-Based Architecture Boilerplate

A scalable React + Vite + TypeScript boilerplate following **feature-based architecture**.

This project provides a clean, modular structure to help you build large React applications that are easy to maintain, test, and grow over time.

---

## 📁 Project Structure

```bash
src/
├── core/                # Global configuration, assets, styles, layouts
├── shared/              # Shared utilities, hooks, components, services
├── features/            # Feature-based modules (e.g. Post, Product)
│   └── Post/
│       ├── components/
│       ├── hooks/
│       ├── types/
│       ├── views/
│       └── routes.ts
├── router.tsx           # Central route aggregation
└── main.tsx             # App entry point
```

---

## 🏗️ Architecture Entities

### `core/`

**Purpose**: Contains global application infrastructure that affects the entire app.

| Folder | Description |
|--------|-------------|
| `assets/` | Global assets like images, fonts, and CSS files |
| `layouts/` | Application layouts (e.g., FullLayout with Header/Footer) |
| `components/` | Third-party UI component wrappers (e.g., shadcn/ui) |

**When to use**: Place files here that configure or style the entire application, not specific features.

---

### `features/`

**Purpose**: Self-contained, independently maintainable feature modules. Each feature encapsulates everything it needs.

**Structure of a feature:**

```bash
features/
└── FeatureName/
    ├── components/      # UI components specific to this feature
    ├── hooks/           # Custom hooks for this feature's logic
    ├── types/           # TypeScript interfaces and types
    ├── views/           # Page-level components
    └── routes.ts        # Feature-specific route definitions
```

**Key principles:**
- Each feature is isolated and self-contained
- Features should not directly import from other features
- Features can import from `shared/` and `core/`
- Easy to add, remove, or refactor features independently

---

### `shared/`

**Purpose**: Cross-feature reusable code that doesn't belong to any specific feature.

| Folder | Description |
|--------|-------------|
| `components/` | Reusable UI components (Card, Loading, EmptyState) |
| `hooks/` | Generic React hooks (useFetch, useLoading) |
| `services/` | API service layer and HTTP utilities |
| `utils/` | Utility functions (formatters, cn class merger) |
| `constants/` | Application-wide constants (API URLs, routes) |
| `types/` | Shared TypeScript interfaces |

**When to use**: When code is used by multiple features or doesn't belong to any specific feature.

---

## 📦 Import Aliases

The project includes path aliases for cleaner imports:

```tsx
import { useFetch } from "@shared/hooks";
import { Card } from "@shared/components";
import PostView from "@features/Post/views/PostView";
import FullLayout from "@/core/layouts/FullLayout";
```

| Alias | Path |
|-------|------|
| `@/` | `src/` |
| `@features/` | `src/features/` |
| `@shared/` | `src/shared/` |

---

## 🚀 Features

- ✅ Feature-based architecture
- ⚡️ Vite for fast development
- 🧠 TypeScript support
- 🔀 Modular routing per feature
- 🎨 Organized global styles and layouts
- 🧱 Clean and scalable file structure
- 🔧 Shared utilities and services layer

---

## 📦 Tech Stack

- React 19
- Vite
- TypeScript
- React Router DOM (v7)
- Tailwind CSS

---

## 🛠️ Getting Started

```bash
# Clone the repo
git clone https://github.com/naserrasoulii/feature-based-react

# Install dependencies
cd feature-based-react
yarn

# Start dev server
yarn dev
```

---

## 📂 Feature Example

Here's how the `Post` feature is organized:

```bash
features/
└── Post/
    ├── components/
    │   ├── PostItem.tsx
    │   └── PostList.tsx
    ├── hooks/
    │   └── usePost.ts
    ├── types/
    │   └── post.types.ts
    ├── views/
    │   └── PostView.tsx
    └── routes.ts
```

---

## 🌐 Routing Example

Each feature can define its own routes in `routes.ts`, then the app combines all routes centrally:

```tsx
// features/Post/routes.ts
export const PostRoutes = [
  { path: "/posts", Component: FullLayout, children: [...] }
];

// router.tsx
import { PostRoutes } from "@features/Post/routes";
export const appRoutes = [...PostRoutes, ...ProductRoutes];
```

---

## 🤝 Contributing

Pull requests and suggestions are welcome!  
If you find this helpful, feel free to star ⭐ the repo or share it with others.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 📬 Contact

Made with ❤️ by [Naser Rasouli]  
GitHub: [@naserrasoulii](https://github.com/naserrasoulii)