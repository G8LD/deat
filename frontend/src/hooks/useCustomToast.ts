import { toast } from "sonner"

const useCustomToast = () => {
  const showSuccessToast = (description: string) => {
    toast.success("Success!", {
      description,
      action: {
        label: "Close",
        onClick: () => {},
      },
      actionButtonStyle: {
        color: "var(--success-text)",
        backgroundColor: "var(--success-bg)",
      },
    })
  }

  const showErrorToast = (description: string) => {
    toast.error("Something went wrong!", {
      description,
      action: {
        label: "Close",
        onClick: () => {},
      },
      actionButtonStyle: {
        color: "var(--error-text)",
        backgroundColor: "var(--error-bg)",
      },
    })
  }

  return { showSuccessToast, showErrorToast }
}

export default useCustomToast
