
import { Slide, toast, type ToastOptions } from "react-toastify";

const toastOptions: ToastOptions = {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: false,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "light",
    transition: Slide,
};

export const notify = {
    success: (message: string) => toast.success(message, toastOptions),

    error: (message: string) => toast.error(message, toastOptions),

    warning: (message: string) => toast.warning(message, toastOptions),

    info: (message: string) => toast.info(message, toastOptions),
};
