import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Box, CircularProgress, Typography } from "@mui/material";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (isLoading) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    void loginWithRedirect();
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <Typography color="text.secondary">Redirecting to login…</Typography>
      </Box>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
