import { APP_NAME, ROUTES } from "@shared/constants";
import { Link } from "react-router";

export default function Header() {
  return (
    <nav className="flex items-center justify-between p-3 shadow">
      <div>
        <Link
          to={ROUTES.HOME}
          className="font-bold text-lg hover:text-gray-600"
        >
          {APP_NAME}
        </Link>
      </div>
      <ul className="flex gap-4">
        <li>
          <Link to={ROUTES.PRODUCTS} className="hover:text-gray-600">
            Products
          </Link>
        </li>
        <li>
          <Link to={ROUTES.POSTS} className="hover:text-gray-600">
            Posts
          </Link>
        </li>
        <li>
          <a
            href="https://github.com/naserrasoulii/feature-based-react"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-600"
          >
            GitHub
          </a>
        </li>
      </ul>
    </nav>
  );
}
