import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast as useGlobalToast } from "@/components/ui/toast";
import { set, z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createCategory, getTypes } from "@/service/product-Service";
import { useAppSelector } from "@/store/hooks";

// Validation schema for category creation
const categorySchema = z.object({
  category_name: z
    .string()
    .min(1, "Category name is required")
    .min(2, "Category name must be at least 2 characters")
    .max(100, "Category name must not exceed 100 characters")
    .regex(
      /^[a-zA-Z0-9\s-_]+$/,
      "Category name can only contain letters, numbers, spaces, hyphens, and underscores"
    ),

  category_code: z
    .string()
    .min(1, "Category code is required")
    .min(1, "Category code must be at least 1 character")
    .max(20, "Category code must not exceed 20 characters")
    .regex(
      /^[A-Z0-9-_]+$/,
      "Category code must be uppercase letters, numbers, hyphens, or underscores only"
    ),


  vehicleType_id: z.string().min(1, "Please select a vehicle type"),
  category_image: z
    .instanceof(File)
    .optional()
    .refine(
      (file) => !file || file.size <= 5 * 1024 * 1024, // 5MB limit
      "Image size must be less than 5MB"
    )
    .refine(
      (file) =>
        !file ||
        ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
          file.type
        ),
      "Only JPEG, PNG, WebP, and GIF images are allowed"
    ),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CreateCategoryProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (category: any) => void;
}

export default function CreateCategory({
  open,
  onClose,
  onSuccess,
}: CreateCategoryProps) {
  const { showToast } = useGlobalToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [typeLoading, setTypeLoading] = useState(false);
  const [type , setType] = useState<any[]>([]);
 const auth = useAppSelector((state)=> state.auth);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      category_name: "",
      category_code: "",
      vehicleType_id: "",
      category_image: undefined,
    },
  });

  const watchedImage = watch("category_image");
// Fetch vehicle types
  useEffect(() => {
    const fetchTypes = async () => {
      setTypeLoading(true);
      try {
        const response = await getTypes();
        if (!response || !response.data) {
          console.error("No data found in response");
          setType([]);
          return;
        }
        const items = response.data;
        // Safe handling of the response structure
        if (items && items.products && Array.isArray(items.products)) {
          setType(items.products);
        } else if (Array.isArray(items)) {
          setType(items);
        } else {
          console.error("Unexpected response structure:", items);
          setType([]);
        }
      } catch (err: any) {
        console.error("Failed to fetch vehicle types:", err);
        setType([]);
        showToast("Failed to fetch vehicle types. Please try again.", "error");
      } finally {
        setTypeLoading(false);
      }
    };
    
    fetchTypes();
  }, [showToast]); // Added showToast to dependencies

  // Handle form submission
  const handleFormSubmit = useCallback(
    async (data: CategoryFormValues) => {
      try {
        console.log("Form data:", data);

        // Validate user authentication - Fixed to match Redux structure
        if (!auth?.user?._id) {
          showToast("User authentication required. Please log in again.", "error");
          return;
        }

        // Create FormData for file upload
        const formData = new FormData();
        formData.append("category_name", data.category_name);
        formData.append("category_code", data.category_code);
        formData.append("main_category", "Main category"); // Assuming main_category is not used
        formData.append("created_by", auth.user._id); // Fixed to match Redux structure
        formData.append("updated_by", auth.user._id); // Fixed to match Redux structure
        formData.append("type", data.vehicleType_id); // Fixed: Send vehicleType_id as 'type' field
        
        if (data.category_image) {
          formData.append("file", data.category_image);
        }
        await createCategory(formData);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        showToast("Category created successfully!", "success");

        // Reset form and close dialog
        reset();
        setImagePreview(null);
        onClose();

        // Call success callback if provided
        if (onSuccess) {
          onSuccess(data);
        }
      } catch (err: any) {
        console.error("Error creating category:", err);
        
        // Extract error message from API response
        const errorMessage = err.response?.data?.message || 
                           err.response?.data?.error || 
                           err.message || 
                           "Failed to create category. Please try again.";
        showToast(errorMessage, "error");
      }
    },
    [showToast, reset, onClose, onSuccess, auth?.user?._id]
  );

  // Handle file selection
  const handleFileSelect = useCallback(
    (file: File) => {
      setValue("category_image", file, { shouldValidate: true });

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    [setValue]
  );

  // Handle file input change
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Remove selected image
  const removeImage = useCallback(() => {
    setValue("category_image", undefined, { shouldValidate: true });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [setValue]);

  // Auto-generate category code from name
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value;
      const code = name
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, "")
        .replace(/\s+/g, "_")
        .substring(0, 20);

      setValue("category_code", code, { shouldValidate: true });
    },
    [setValue]
  );

  // Handle dialog close
  const handleClose = useCallback(() => {
    reset();
    setImagePreview(null);
    onClose();
  }, [reset, onClose]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Create New Category
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                   {/* VehicleType Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="vehicleType_id" className="text-sm font-medium">
              Vehicle Type <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="vehicleType_id"
              control={control}
              render={({ field }) => (
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  disabled={typeLoading}
                >
                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 rounded-lg">
                    <SelectValue 
                      placeholder={
                        typeLoading 
                          ? "Loading vehicle types..." 
                          : (!type || !Array.isArray(type) || type.length === 0)
                            ? "No vehicle types available" 
                            : "Select a vehicle type"
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {type && Array.isArray(type) && type.length > 0 ? (
                      type.map((option) => (
                        <SelectItem key={option?._id || Math.random()} value={option?._id || ""}>
                          {option?.type_name || "Unknown Type"}
                        </SelectItem>
                      ))
                    ) : (
                      !typeLoading && (
                        <SelectItem value="no-types" disabled>
                          No vehicle types available
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.vehicleType_id && (
              <span className="text-red-500 text-sm">
                {errors.vehicleType_id.message}
              </span>
            )}
          </div>
          
          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="category_name" className="text-sm font-medium">
              Category Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="category_name"
              placeholder="Enter category name"
              className="w-full bg-gray-50 border-gray-200 rounded-lg"
              {...register("category_name")}
            />
            {errors.category_name && (
              <span className="text-red-500 text-sm">
                {errors.category_name.message}
              </span>
            )}
          </div>

          {/* Category Code */}
          <div className="space-y-2">
            <Label htmlFor="category_code" className="text-sm font-medium">
              Category Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="category_code"
              placeholder="Enter category code"
              className="w-full bg-gray-50 border-gray-200 rounded-lg"
              {...register("category_code")}
            />
            {errors.category_code && (
              <span className="text-red-500 text-sm">
                {errors.category_code.message}
              </span>
            )}
            <p className="text-xs text-gray-500">
              Code is auto-generated from the category name but can be edited
            </p>
          </div>


          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Category Image</Label>

            {!imagePreview ? (
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium text-blue-600">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, WebP or GIF (max. 5MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Category preview"
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {errors.category_image && (
              <span className="text-red-500 text-sm">
                {errors.category_image.message}
              </span>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#C72920] hover:bg-[#C72920]/90"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                "Create Category"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}