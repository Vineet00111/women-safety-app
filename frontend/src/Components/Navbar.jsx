import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../Context/AuthContext';

function Navbar() {
    const [isOpen, setOpen] = useState(false);
    const navigate = useNavigate();
    const { auth, logout } = useContext(AuthContext);

    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleStart = () => {
        setOpen(false);
        if (auth) {
            navigate('/HomePage');
        } else {
            navigate("/register");
        }
    };

    const handleLogout = async () => {
        const res = await logout();
        setOpen(false);
        if (res) navigate("/login");
    };

    const toggleNavbar = () => {
        setOpen((prev) => !prev);
    };

    const closeMenu = () => {
        setOpen(false);
    };

    const menuItems = [
        {
            name: "Testimonials",
            url: "#testimony",
            type: "anchor",
            status: !auth,
        },
        {
            name: "Contact Us",
            url: "mailto:abdullahmukadam21@gmail.com",
            type: "external",
            status: true,
        },
        {
            name: "Home",
            url: "/HomePage",
            type: "route",
            status: auth,
        },
    ];

    return (
        <nav className="sticky top-0 z-[5000] isolate w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
            <div className="w-full px-4 py-3 flex items-center justify-between md:px-6">
                <div className="flex items-center">
                    <img className="h-9" src="/logo.svg" alt="Logo" />
                </div>

                <div className="hidden md:flex items-center gap-8">
                    {menuItems.map((item) => {
                        if (!item.status) return null;

                        if (item.type === "route") {
                            return (
                                <Link
                                    key={item.name}
                                    className="text-gray-700 font-mono font-bold hover:text-black transition-colors duration-300"
                                    to={item.url}
                                >
                                    {item.name}
                                </Link>
                            );
                        }

                        return (
                            <a
                                key={item.name}
                                className="text-gray-700 font-mono font-bold hover:text-black transition-colors duration-300"
                                href={item.url}
                            >
                                {item.name}
                            </a>
                        );
                    })}
                </div>

                <div className="flex items-center justify-end">
                    {auth ? (
                        <button
                            className="hidden md:block px-6 py-2 text-white bg-black rounded-lg font-bold font-mono hover:bg-gray-800 transition-colors duration-300"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    ) : (
                        <button
                            className="hidden md:block px-6 py-2 text-white bg-black rounded-lg font-bold font-mono hover:bg-gray-800 transition-colors duration-300"
                            onClick={handleStart}
                        >
                            Get Started
                        </button>
                    )}

                    <button
                        className="relative ml-3 w-10 h-10 rounded-lg border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-red-400 md:hidden"
                        onClick={toggleNavbar}
                        aria-label="Toggle menu"
                        aria-expanded={isOpen}
                    >
                        <div className="absolute w-6 transform -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2">
                            <span
                                className={`absolute h-0.5 w-6 bg-black transform transition duration-300 ease-in-out ${isOpen ? 'rotate-45 delay-200' : '-translate-y-1.5'
                                    }`}
                            />
                            <span
                                className={`absolute h-0.5 bg-black transform transition-all duration-200 ease-in-out ${isOpen ? 'w-0 opacity-0' : 'w-6 delay-200 opacity-100'
                                    }`}
                            />
                            <span
                                className={`absolute h-0.5 w-6 bg-black transform transition duration-300 ease-in-out ${isOpen ? '-rotate-45 delay-200' : 'translate-y-1.5'
                                    }`}
                            />
                        </div>
                    </button>
                </div>
            </div>

            <div
                className={`md:hidden fixed inset-0 top-[73px] z-[5001] transition-all duration-300 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'
                    }`}
            >
                <button
                    type="button"
                    onClick={closeMenu}
                    className={`absolute inset-0 bg-black/45 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'
                        }`}
                    aria-label="Close menu overlay"
                />

                <div
                    className={`relative z-[5002] mx-4 mt-4 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
                        }`}
                >
                    <div className="flex flex-col p-4 gap-3">
                        {menuItems.map((item) => {
                            if (!item.status) return null;

                            if (item.type === "route") {
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.url}
                                        onClick={closeMenu}
                                        className="w-full rounded-xl px-4 py-3 text-left text-gray-900 font-semibold bg-gray-50 hover:bg-red-50 hover:text-red-700 transition-colors"
                                    >
                                        {item.name}
                                    </Link>
                                );
                            }

                            return (
                                <a
                                    key={item.name}
                                    href={item.url}
                                    onClick={closeMenu}
                                    className="w-full rounded-xl px-4 py-3 text-left text-gray-900 font-semibold bg-gray-50 hover:bg-red-50 hover:text-red-700 transition-colors"
                                >
                                    {item.name}
                                </a>
                            );
                        })}

                        {auth ? (
                            <button
                                className="mt-2 w-full py-3 text-white bg-black rounded-xl font-bold font-mono hover:bg-gray-800 transition-colors duration-300"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        ) : (
                            <button
                                className="mt-2 w-full py-3 text-white bg-black rounded-xl font-bold font-mono hover:bg-gray-800 transition-colors duration-300"
                                onClick={handleStart}
                            >
                                Get Started
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
