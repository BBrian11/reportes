import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

export const toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: true,
});

export const confirm = (title, text, confirmButtonText = "Sí") =>
  Swal.fire({
    title,
    text,
    icon: "question",
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: "Cancelar",
    reverseButtons: true,
  });

export default Swal;
