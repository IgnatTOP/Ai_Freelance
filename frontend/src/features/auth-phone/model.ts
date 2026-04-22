"use client";

import { useMutation } from "@tanstack/react-query";
import { authApi, type LoginPhoneInput, type RegisterPhoneInput, type VerifyPhoneInput } from "@/shared/api/endpoints/auth";

export const useRegisterPhone = () =>
  useMutation({
    mutationFn: (payload: RegisterPhoneInput) => authApi.registerPhone(payload)
  });

export const useLoginPhone = () =>
  useMutation({
    mutationFn: (payload: LoginPhoneInput) => authApi.loginPhone(payload)
  });

export const useVerifyPhone = () =>
  useMutation({
    mutationFn: (payload: VerifyPhoneInput) => authApi.verifyPhone(payload)
  });
