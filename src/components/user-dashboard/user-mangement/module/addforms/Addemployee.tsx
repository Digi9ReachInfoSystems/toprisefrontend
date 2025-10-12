"use client";

import type React from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  employeeSchema,
  type EmployeeFormValues,
} from "@/lib/schemas/employee-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addEmployee } from "@/service/employeeServices";
import { useToast as useGlobalToast } from "@/components/ui/toast";
import { Eye, EyeOff } from "lucide-react";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useAppSelector } from "@/store/hooks";

export default function Addemployee() {
  const router = useRouter();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormValues | null>(null);
  const { showToast } = useGlobalToast();
  const allowedRoles = ["Super-admin", "Inventory-Admin", "Fulfillment-Admin"];
  const auth = useAppSelector((state) => state.auth.user);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    mode: "onChange", // Validate on change for real-time feedback
    reValidateMode: "onChange", // Re-validate on change after first submission
    defaultValues: {
      email: "",
      username: "",
      password: "",
      mobileNumber: "",
      role: "",
      employeeId: "",
      fullName: "",
    },
  });

  // Ensure form is properly reset when component mounts
  useEffect(() => {
    form.reset({
      email: "",
      username: "",
      password: "",
      mobileNumber: "",
      role: "",
      employeeId: "",
      fullName: "",
    });
  }, [form]);

  const handleFormSubmit = (data: EmployeeFormValues) => {
    setFormData(data);
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    if (!formData) return;

    setSubmitLoading(true);
    try {
      const payload = {
        email: formData.email,
        username: formData.username,
        password: formData.password,
        phone_Number: formData.mobileNumber,
        role: formData.role,
        employee_id: formData.employeeId,
        First_name: formData.fullName,
        mobile_number: formData.mobileNumber,
        employeeRole: formData.role,
        assigned_regions: formData.assignedRegion || [],
      };

      const response = await addEmployee(payload);

      // Check if employee was created successfully
      if (response.success) {
        // Enhanced success notification
        console.log("Employee created successfully, showing toast...");
        showToast(
          `🎉 Employee "${formData.fullName}" (${formData.employeeId}) has been added to the system successfully! They can now log in with their credentials.`,
          "success"
        );

        // Close confirmation dialog first
        setShowConfirmation(false);

        // Reset form
        form.reset();
        setFormData(null);

        // Navigate back to user management page after showing toast
        setTimeout(() => {
          router.push("/user/dashboard/user");
        }, 2000); // Wait 2 seconds to show the toast before navigating
      } else {
        // Handle unsuccessful response
        throw new Error(response.message || "Failed to create employee");
      }
    } catch (error: any) {
      // Better error handling
      let errorMessage = "Failed to add employee. Please try again.";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid data provided. Please check your inputs.";
      } else if (error.response?.status === 409) {
        errorMessage = "Employee with this email or username already exists.";
      } else if (error.response?.status === 500) {
        errorMessage = "Server error. Please try again later.";
      }

      showToast(errorMessage, "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Role-based access control
  if (!auth || !allowedRoles.includes(auth.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600 font-bold">
          You do not have permission to access this page.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 bg-neutral-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
          Add employee
        </h1>
        <p className="text-sm text-gray-500">Add your employee details</p>
      </div>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-6"
      >
        {/* Personal & Contact Information */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-600 font-semibold text-lg">
              Personal & Contact Information
            </CardTitle>
            <p className="text-sm text-gray-500">
              Basic information to uniquely identify the employee in the system.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Full Name *
              </label>
              <Input
                id="fullName"
                placeholder="Enter full name (e.g., John Doe)"
                {...form.register("fullName")}
                className={`bg-gray-50 ${
                  form.formState.errors.fullName 
                    ? "border-red-500 focus-visible:ring-red-500" 
                    : "border-gray-200"
                }`}
              />
              {form.formState.errors.fullName && (
                <p className="text-red-500 text-xs mt-1 flex items-start gap-1">
                  <span className="text-red-500">⚠</span>
                  {form.formState.errors.fullName.message}
                </p>
              )}
              {!form.formState.errors.fullName && form.watch("fullName") && (
                <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                  <span>✓</span>
                  Valid name
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="employeeId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Employee ID *
              </label>
              <Input
                id="employeeId"
                placeholder="Enter employee ID (e.g., EMP-001)"
                {...form.register("employeeId")}
                className={`bg-gray-50 ${
                  form.formState.errors.employeeId 
                    ? "border-red-500 focus-visible:ring-red-500" 
                    : "border-gray-200"
                }`}
              />
              {form.formState.errors.employeeId && (
                <p className="text-red-500 text-xs mt-1 flex items-start gap-1">
                  <span className="text-red-500">⚠</span>
                  {form.formState.errors.employeeId.message}
                </p>
              )}
              {!form.formState.errors.employeeId && form.watch("employeeId") && (
                <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                  <span>✓</span>
                  Valid employee ID
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Username *
              </label>
              <Input
                id="username"
                placeholder="Enter username (e.g., john_doe123)"
                {...form.register("username")}
                className={`bg-gray-50 ${
                  form.formState.errors.username 
                    ? "border-red-500 focus-visible:ring-red-500" 
                    : "border-gray-200"
                }`}
                autoComplete="off"
              />
              {form.formState.errors.username && (
                <p className="text-red-500 text-xs mt-1 flex items-start gap-1">
                  <span className="text-red-500">⚠</span>
                  {form.formState.errors.username.message}
                </p>
              )}
              {!form.formState.errors.username && form.watch("username") && (
                <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                  <span>✓</span>
                  Valid username
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password *
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter Password"
                  {...form.register("password")}
                  className="bg-gray-50 border-gray-200 pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {form.formState.errors.password && (
                <p className="text-red-500 text-xs mt-1">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-600 font-semibold text-lg">
              Contact Information
            </CardTitle>
            <p className="text-sm text-gray-500">
              Primary contact and communication details.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="mobileNumber"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Mobile Number *
              </label>
              <Input
                id="mobileNumber"
                type="tel"
                placeholder="Enter 10-digit mobile number (e.g., 9876543210)"
                {...form.register("mobileNumber")}
                className={`bg-gray-50 ${
                  form.formState.errors.mobileNumber 
                    ? "border-red-500 focus-visible:ring-red-500" 
                    : "border-gray-200"
                }`}
                maxLength={10}
              />
              {form.formState.errors.mobileNumber && (
                <p className="text-red-500 text-xs mt-1 flex items-start gap-1">
                  <span className="text-red-500">⚠</span>
                  {form.formState.errors.mobileNumber.message}
                </p>
              )}
              {!form.formState.errors.mobileNumber && form.watch("mobileNumber") && (
                <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                  <span>✓</span>
                  Valid mobile number
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email *
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address (e.g., john.doe@company.com)"
                {...form.register("email")}
                className={`bg-gray-50 ${
                  form.formState.errors.email 
                    ? "border-red-500 focus-visible:ring-red-500" 
                    : "border-gray-200"
                }`}
                autoComplete="off"
              />
              {form.formState.errors.email && (
                <p className="text-red-500 text-xs mt-1 flex items-start gap-1">
                  <span className="text-red-500">⚠</span>
                  {form.formState.errors.email.message}
                </p>
              )}
              {!form.formState.errors.email && form.watch("email") && (
                <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                  <span>✓</span>
                  Valid email address
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Role Information */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-600 font-semibold text-lg">
              Role Information
            </CardTitle>
            <p className="text-sm text-gray-500">Define the employee's role.</p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Role *
              </label>
              <Select
                value={form.watch("role")}
                onValueChange={(value) =>
                  form.setValue("role", value, { shouldValidate: true })
                }
                name="role"
              >
                <SelectTrigger className="bg-gray-50 border-gray-200 w-full rounded-md px-3 py-2 text-sm">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Super-admin">Super-admin</SelectItem>
                  <SelectItem value="Fulfillment-Admin">
                    Fulfillment-Admin
                  </SelectItem>
                  <SelectItem value="Fulfillment-Staff">
                    Fulfillment-Staff
                  </SelectItem>
                  <SelectItem value="Inventory-Admin">
                    Inventory-Admin
                  </SelectItem>
                  <SelectItem value="Inventory-Staff">
                    Inventory-Staff
                  </SelectItem>
                  {/* <SelectItem value="Dealer">Dealer</SelectItem>
                  <SelectItem value="User">User</SelectItem> */}
                </SelectContent>
              </Select>
              {form.formState.errors.role && (
                <p className="text-red-500 text-xs mt-1">
                  {form.formState.errors.role.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Region Assignment */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-600 font-semibold text-lg">
              Region Assignment
            </CardTitle>
            <p className="text-sm text-gray-500">
              Assign the employee to specific regions for operational
              management.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Assigned Regions
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  "North",
                  "South",
                  "East",
                  "West",
                  "Central",
                  "Northeast",
                  "Northwest",
                  "Southeast",
                  "Southwest",
                ].map((region) => (
                  <label
                    key={region}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      value={region}
                      checked={
                        form.watch("assignedRegion")?.includes(region) || false
                      }
                      onChange={(e) => {
                        const currentRegions =
                          form.watch("assignedRegion") || [];
                        if (e.target.checked) {
                          form.setValue("assignedRegion", [
                            ...currentRegions,
                            region,
                          ]);
                        } else {
                          form.setValue(
                            "assignedRegion",
                            currentRegions.filter((r) => r !== region)
                          );
                        }
                      }}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">{region}</span>
                  </label>
                ))}
              </div>
              {form.formState.errors.assignedRegion && (
                <p className="text-red-500 text-xs mt-1">
                  {form.formState.errors.assignedRegion.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={submitLoading || !form.formState.isValid}
          >
            {submitLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  ></path>
                </svg>
                Adding...
              </span>
            ) : (
              "Add Employee"
            )}
          </Button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmSubmit}
        title="Confirm Add Employee"
        description={`Are you sure you want to add "${formData?.fullName}" as a new employee?`}
        confirmText="Yes, Add Employee"
        cancelText="Cancel"
      />
    </div>
  );
}
