import React from "react";

const Modal = ({ children, onClose }) => {
  return (
    // Full-screen overlay with backdrop blur
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
      onClick={onClose} // close when clicking outside modal
    >
      {/* Stop click propagation so clicking inside modal does not close */}
      <div
        className="bg-white/20 backdrop-blur-lg rounded-xl shadow-2xl p-6 w-full max-w-lg text-white transition-transform transform hover:scale-105"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
