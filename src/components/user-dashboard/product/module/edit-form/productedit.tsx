"use client";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { selectProductById } from "@/store/slice/product/productSlice";
import { useAppSelector } from "@/store/hooks";
import { DynamicBreadcrumb } from "@/components/user-dashboard/DynamicBreadcrumb";

// @ts-ignore
import { TagsInput } from "react-tag-input-component";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCategories,
  getSubCategories,
  getTypes,
  getBrandByType,
  getModelByBrand,
  getYearRange,
  getvarientByModel,
  editProduct,
  getProductById,
} from "@/service/product-Service";
import { getDealersByCategory } from "@/service/dealerServices";
import { useParams, useRouter } from "next/navigation";
import { Product } from "@/types/product-Types";
import { useToast as useGlobalToast } from "@/components/ui/toast";

const schema = z.object({
  manufacturer_part_name: z.string().optional(),
  product_name: z.string().min(1, "Product Name is required"),
  brand: z.string().optional(),
  hsn_code: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  sub_category: z.string().min(1, "Sub-category is required"),
  // Added fields
  no_of_stock: z.coerce
    .number()
    .int({ message: "No. of Stock must be an integer" }),
  selling_price: z.coerce
    .number()
    .int({ message: "Selling Price must be an integer" }),
  updatedBy: z.string().optional(),
  admin_notes: z.string().optional(),
  product_type: z.string(),
  vehicle_type: z.string(),
  // Vehicle Compatibility
  make: z.string().min(1, "Make is required"),
  make2: z.string().optional(),
  model: z.string().min(1, "Model is required"),
  year_range: z.string().optional(),
  variant: z.string().min(1, "Variant is required"),
  fitment_notes: z.string().optional(),
  is_universal: z.string().optional(),
  is_consumable: z.string().optional(),
  // Technical Specifications
  weight: z.coerce.number().min(0, "Weight must be a positive number").optional(),
  certifications: z.string().optional(),
  warranty: z.string().optional(),
  // Media & Documentation
  images: z.string().optional(),
  videoUrl: z.string().optional(),
  // Pricing details
  mrp_with_gst: z.string().min(1, "mrp_with_gst is required"),
  gst_percentage: z.string().min(1, "gst_percentage is required"),
  // Return & Availability
  is_returnable: z.string().min(1, "is_returnable is required"),
  return_policy: z.string().min(1, "Return Policy is required"),
  // Dealer-Level Mapping & Routing
  dealerAssignments: z.array(z.object({
    dealerId: z.string().min(1, "Dealer is required"),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    margin: z.coerce.number().optional(),
    priority: z.coerce.number().optional(),
  })).optional(),
  LastinquiredAt: z.string().optional(),

  // Status, Audit & Metadata
  active: z.string().optional(),
  createdBy: z.string().optional(),
  modifiedAtBy: z.string().optional(),
  changeLog: z.string().optional(),
  // SEO & Search Optimization
  seo_title: z.string().optional(),
  searchTags: z.string().optional(),
  search_tags: z.array(z.string()).optional(),
  seo_description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ProductEdit() {
  const router = useRouter();
  // State for dropdown options
    const auth = useAppSelector((state) => state.auth.user);
  const [categoryOptions, setCategoryOptions] = useState<any[]>([]);
  const [subCategoryOptions, setSubCategoryOptions] = useState<any[]>([]);
  const [typeOptions, setTypeOptions] = useState<any[]>([]);
  const [modelOptions, setModelOptions] = useState<any[]>([]);
  const [yearRangeOptions, setYearRangeOptions] = useState<any[]>([]);
  const [varientOptions, setVarientOptions] = useState<any[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  // State for dependent dropdowns
  const [selectedProductTypeId, setSelectedProductTypeId] =
    useState<string>("");
  const [selectedbrandId, setSelectedBrandId] = useState<string>("");
  const [modelId, setModelId] = useState<string>("");
  const id = useParams();
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [brandOptions, setBrandOptions] = useState<any[]>([]);

  // State for image uploads and previews
  const [selectedImages, setSelectedImages] = useState<File[]>([]); // new uploads
  const [selectedImagePreviews, setSelectedImagePreviews] = useState<string[]>([]); // new upload previews
  const [existingImages, setExistingImages] = useState<string[]>([]); // URLs of images from backend
  const [removedExistingIndexes, setRemovedExistingIndexes] = useState<number[]>([]); // indexes of removed existing images
  const [apiError, setApiError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [availableDealers, setAvailableDealers] = useState<any[]>([]);
  const [dealerAssignments, setDealerAssignments] = useState<Array<{
    dealerId: string;
    quantity: number;
    margin?: number;
    priority?: number;
  }>>([]);
  const [loadingDealers, setLoadingDealers] = useState(false);
  const { showToast } = useGlobalToast();
  const allowedRoles = ["Super-admin", "Inventory-Admin", "Inventory-Staff"];


  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
  });

  // Function to fetch dealers by category
  const fetchDealersByCategory = async (categoryId: string) => {
    if (!categoryId) {
      setAvailableDealers([]);
      return;
    }
    
    try {
      setLoadingDealers(true);
      console.log("Fetching dealers for category:", categoryId);
      const response = await getDealersByCategory(categoryId);
      console.log("Dealers API response:", response);
      
      if (response.success && response.data && Array.isArray(response.data)) {
        setAvailableDealers(response.data);
        console.log("Set available dealers:", response.data.length);
      } else {
        setAvailableDealers([]);
        console.log("No dealers found or invalid response");
      }
    } catch (error) {
      console.error("Failed to fetch dealers by category:", error);
      setAvailableDealers([]);
    } finally {
      setLoadingDealers(false);
    }
  };
  // Handle image file input change
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedImages((prev) => [...prev, ...filesArray]);
      filesArray.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedImagePreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
      setValue("images", ""); // not used for validation here
    }
  };
  // Parallel fetch for categories, subcategories, types, and year ranges
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [categories, subCategories, types, yearRanges] =
          await Promise.all([
            getCategories(),
            getSubCategories(),
            getTypes(),
            getYearRange(),
          ]);
        setCategoryOptions(categories.data.map((category: any) => category));
        setSubCategoryOptions(
          subCategories.data.map((category: any) => category)
        );
        setTypeOptions(types.data.map((type: any) => type));
        setYearRangeOptions(yearRanges.data.map((year: any) => year));
        console.log("Fetched all initial data in parallel");
      } catch (error) {
        console.error("Failed to fetch initial data in parallel:", error);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch brands when product type changes
  useEffect(() => {
    if (!selectedProductTypeId) {
      setBrandOptions([]);
      return;
    }

    let isMounted = true;
    const fetchBrandsByType = async () => {
      setIsLoadingBrands(true);
      try {
        const response = await getBrandByType(selectedProductTypeId);
        console.log("Brand Options:", response.data);
        if (isMounted) {
          setBrandOptions(response.data.map((brand: any) => brand));
        }
      } catch (error) {
        if (isMounted) setBrandOptions([]);
        console.error("Failed to fetch brands by type:", error);
      } finally {
        if (isMounted) setIsLoadingBrands(false);
      }
    };

    fetchBrandsByType();
    return () => {
      isMounted = false;
    };
  }, [selectedProductTypeId]);

  // Fetch models when brand changes
  useEffect(() => {
    if (!selectedbrandId) {
      setModelOptions([]);
      return;
    }
    const fetchModelsByBrand = async () => {
      try {
        const response = await getModelByBrand(selectedbrandId);
        setModelOptions(response.data.map((model: any) => model));
        console.log("Model Options:", response.data);
      } catch (error) {
        setModelOptions([]);
        console.error("Failed to fetch models by brand:", error);
      }
    };
    fetchModelsByBrand();
  }, [selectedbrandId]);

  // Fetch variants when model changes
  useEffect(() => {
    if (!modelId) {
      setVarientOptions([]);
      return;
    }
    const fetchVarientByModel = async () => {
      try {
        const response = await getvarientByModel(modelId);
        setVarientOptions(response.data.map((varient: any) => varient));
        console.log("Varient Options:", response.data);
      } catch (error) {
        console.error("Failed to fetch varient options:", error);
      }
    };
    fetchVarientByModel();
  }, [modelId]);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!id.id || typeof id.id !== "string") {
        setApiError("Product ID is missing or invalid.");
        return;
      }

      setIsLoadingProduct(true);
      setApiError("");
      
      try {
        const response = await getProductById(id.id);
        // response is ProductResponse, which has data: Product[]
        const data = response.data;
        if (Array.isArray(data) && data.length > 0) {
          setProduct(data[0]);
        } else if (
          typeof data === "object" &&
          data !== null &&
          !Array.isArray(data)
        ) {
          setProduct(data as Product);
        } else {
          setProduct(null);
          setApiError("Product not found.");
        }
        console.log("getProducts API response:", response);
      } catch (error: any) {
        console.error("getProducts API error:", error);
        setApiError(
          error.response?.data?.message || 
          error.message || 
          "Failed to fetch product details."
        );
        setProduct(null);
      } finally {
        setIsLoadingProduct(false);
      }
    };
    
    fetchProducts();
  }, [id.id]);

  // Watch for category changes and fetch dealers
  useEffect(() => {
    const categoryId = watch("category");
    if (categoryId) {
      fetchDealersByCategory(categoryId);
    } else {
      setAvailableDealers([]);
    }
  }, [watch("category")]);

  // Watch for category changes and fetch subcategories
  useEffect(() => {
    const categoryId = watch("category");
    if (categoryId) {
      const fetchSubCategoriesByCategory = async () => {
        try {
          const response = await getSubCategories(categoryId);
          if (response.success && Array.isArray(response.data)) {
            setSubCategoryOptions(response.data);
          }
        } catch (error) {
          console.error("Failed to fetch subcategories:", error);
        }
      };
      fetchSubCategoriesByCategory();
    } else {
      setSubCategoryOptions([]);
    }
  }, [watch("category")]);

  // Also fetch dealers when product loads (in case category is already set)
  useEffect(() => {
    if (product && product.category?._id) {
      fetchDealersByCategory(product.category._id);
    }
  }, [product]);

  // Fetch subcategories when product loads (in case category is already set)
  useEffect(() => {
    if (product && product.category?._id) {
      const fetchSubCategoriesByCategory = async () => {
        try {
          const response = await getSubCategories(product.category._id);
          if (response.success && Array.isArray(response.data)) {
            setSubCategoryOptions(response.data);
          }
        } catch (error) {
          console.error("Failed to fetch subcategories for product:", error);
        }
      };
      fetchSubCategoriesByCategory();
    }
  }, [product]);

  // Populate form with fetched product data
  useEffect(() => {
    if (product) {
      // Use setTimeout to ensure dependent dropdowns are loaded first
      const populateForm = () => {
        reset({
          sku_code: product.sku_code || "",
          manufacturer_part_name: product.manufacturer_part_name || "",
          product_name: product.product_name || "",
          brand: product.brand?._id || "",
          vehicle_type: product.brand?.type || "",
          hsn_code: product.hsn_code || "",
          category: product.category?._id || "",
          sub_category: product.sub_category?._id || "",
          product_type: product.product_type || "",
          no_of_stock: product.no_of_stock,
          selling_price: product.selling_price,
          updatedBy: product.updated_at || "",
          admin_notes: product.admin_notes || "",
          make: product.make && product.make.length > 0 ? product.make[0] : "",
          make2: product.make && product.make.length > 1 ? product.make[1] : "",
         
          model: product.model?._id || "",
          year_range:
            product.year_range && product.year_range.length > 0
              ? product.year_range[0]._id
              : "",
          variant:
            product.variant && product.variant.length > 0
              ? product.variant[0]._id
              : "",
          fitment_notes: product.fitment_notes || "",
          is_universal: product.is_universal ? "yes" : "no",
          is_consumable: product.is_consumable ? "yes" : "no",
          weight: product.weight?.toString() || "",
          certifications: product.certifications || "",
          warranty: product.warranty?.toString() || "",
          images: product.images?.join(",") || "",
          videoUrl: (product as any).video_url || (product as any).videoUrl || "",
          mrp_with_gst: product.mrp_with_gst?.toString() || "",
          gst_percentage: product.gst_percentage?.toString() || "",
          is_returnable: product.is_returnable ? "yes" : "no",
          return_policy: product.return_policy || "",
          dealerAssignments: [],
          LastinquiredAt: product.last_stock_inquired || "",
          seo_title: product.seo_title || "",
          searchTags: product.search_tags?.join(",") || "",
          search_tags: product.search_tags || [],
          seo_description: product.seo_description || "",
        });
        
        // Set brand ID for model dependency
        if (product.brand?._id) {
          setSelectedBrandId(product.brand._id);
        }
        
        // Set model ID for variant dependency
        if (product.model?._id) {
          setModelId(product.model._id);
        }
      };

      // Delay form population to allow dependent dropdowns to load
      setTimeout(populateForm, 100);

      // Initialize image previews for existing images
      if (product.images && Array.isArray(product.images)) {
        setExistingImages(product.images);
      } else {
        setExistingImages([]);
      }
      setSelectedImages([]);
      setSelectedImagePreviews([]);
      setRemovedExistingIndexes([]);
      
      // Populate dealer assignments from available_dealers
      if (product.available_dealers && Array.isArray(product.available_dealers) && product.available_dealers.length > 0) {
        const assignments = product.available_dealers
          .filter(dealer => dealer.dealers_Ref)
          .map(dealer => ({
            dealerId: dealer.dealers_Ref || "",
            quantity: dealer.quantity_per_dealer || 0,
            margin: dealer.dealer_margin || 0,
            priority: (dealer as any).priority || 0
          }));
        setDealerAssignments(assignments);
      } else {
        setDealerAssignments([]);
      }
    }
  }, [product, reset]);

  // Initialize dependent state variables when product loads
  useEffect(() => {
    if (!product) return;

    // Set vehicle type ID for brand dependency using the brand's type
    if (product.brand?.type) {
      setSelectedProductTypeId(product.brand.type);
      setValue("vehicle_type", product.brand.type);
    }

    // Set brand ID for model dependency
    if (product.brand?._id) {
      setSelectedBrandId(product.brand._id);
    }

    // Set model ID for variant dependency
    if (product.model?._id) {
      setModelId(product.model._id);
    }
  }, [product, setValue]);

  // Fetch dependent dropdown options when product loads
  useEffect(() => {
    if (!product) return;

    const fetchDependentOptions = async () => {
      try {
        // Fetch brands if vehicle type is available
        if (product.brand?.type) {
          const brandsResponse = await getBrandByType(product.brand.type);
          if (brandsResponse.success && Array.isArray(brandsResponse.data)) {
            setBrandOptions(brandsResponse.data);
          }
        }

        // Fetch models if brand is available
        if (product.brand?._id) {
          const modelsResponse = await getModelByBrand(product.brand._id);
          if (modelsResponse.success && Array.isArray(modelsResponse.data)) {
            setModelOptions(modelsResponse.data);
          }
        }

        // Fetch variants if model is available
        if (product.model?._id) {
          const variantsResponse = await getvarientByModel(product.model._id);
          if (variantsResponse.success && Array.isArray(variantsResponse.data)) {
            setVarientOptions(variantsResponse.data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch dependent options:", error);
      }
    };

    fetchDependentOptions();
  }, [product]);

  // Additional useEffect to ensure brand options are loaded for edit mode
  useEffect(() => {
    if (product && product.brand?.type && brandOptions.length === 0) {
      const fetchBrandsForEdit = async () => {
        try {
          const response = await getBrandByType(product.brand.type);
          if (response.success && Array.isArray(response.data)) {
            setBrandOptions(response.data);
          }
        } catch (error) {
          console.error("Failed to fetch brands for edit:", error);
        }
      };
      fetchBrandsForEdit();
    }
  }, [product, brandOptions.length]);

  // Prepopulate dependent dropdowns in correct order after product data loads

  
  useEffect(() => {
    if (!product) return;

    // Vehicle Type will be set separately when the user selects it
    // since it's not part of the Product interface from the API
  }, [product, typeOptions, setValue]);

  useEffect(() => {
    // Brand - Set immediately when product loads, then update when options are available
    if (product && product.brand) {
      if (brandOptions.length > 0) {
        // Options are loaded, find and set the correct brand
        const selectedBrandObj = brandOptions.find(
          (b) =>
            b.brand_name === product.brand?.brand_name ||
            b._id === product.brand?._id
        );
        if (selectedBrandObj) {
          setSelectedBrandId(selectedBrandObj._id);
          setValue("brand", selectedBrandObj._id);
        }
      } else {
        // Options not loaded yet, set the brand ID directly
        setSelectedBrandId(product.brand._id);
        setValue("brand", product.brand._id);
      }
    }
  }, [product, brandOptions, setValue]);

  useEffect(() => {
    // Model
    if (product && modelOptions.length > 0 && product.model) {
      const selectedModelObj = modelOptions.find(
        (m) =>
          m.model_name === product.model?.model_name ||
          m._id === product.model?._id
      );
      if (selectedModelObj) {
        setModelId(selectedModelObj._id);
        setValue("model", selectedModelObj._id); // Set ID, not name
      }
    }
  }, [product, modelOptions, setValue]);

  useEffect(() => {
    // Variant
    if (
      product &&
      varientOptions.length > 0 &&
      product.variant &&
      product.variant.length > 0
    ) {
      const selectedVariantObj = varientOptions.find(
        (v) =>
          v.variant_name === product.variant?.[0]?.variant_name ||
          v._id === product.variant?.[0]?._id
      );
      if (selectedVariantObj) {
        setValue("variant", selectedVariantObj._id); // Set ID, not name
      }
    }
  }, [product, varientOptions, setValue]);

  useEffect(() => {
    // Year Range
    if (
      product &&
      yearRangeOptions.length > 0 &&
      product.year_range &&
      product.year_range.length > 0
    ) {
      const selectedYearObj = yearRangeOptions.find(
        (y) =>
          y.year_name === product.year_range?.[0]?.year_name ||
          y._id === product.year_range?.[0]?._id
      );
      if (selectedYearObj) {
        setValue("year_range", selectedYearObj._id); // Set ID for Select component
      }
    }
  }, [product, yearRangeOptions, setValue]);

  const onSubmit = async (data: FormValues) => {
    setApiError("");
    setIsSubmitting(true);

    if (typeof id.id === "string") {
      const preparedData = {
        ...data,
        dealerAssignments: dealerAssignments,
      };

      // Always use FormData for images update
      const formData = new FormData();
      // Append all prepared fields except images
      Object.entries(preparedData).forEach(([key, value]) => {
        if (key !== "images" && value != null) {
          if (key === "dealerAssignments" && Array.isArray(value)) {
            // Special handling for dealerAssignments array
            formData.append("dealerAssignments", JSON.stringify(value));
          } else if (Array.isArray(value)) {
            value.forEach((v) => formData.append(`${key}[]`, v));
          } else {
            formData.append(key, value.toString());
          }
        }
      });
      // Append new image files
      selectedImages.forEach((file) => {
        formData.append("images", file);
      });
      // Append remaining existing images (not removed)
      existingImages.forEach((url, idx) => {
        if (!removedExistingIndexes.includes(idx)) {
          formData.append("existingImages", url);
        }
      });
      // Debug: Log FormData contents
      console.log("FormData contents:");
      for (let pair of formData.entries()) {
        console.log(pair[0] + ": " + pair[1]);
      }
      try {
        const response = await editProduct(id.id, formData);
        showToast("Product updated successfully", "success");
        setApiError("");
        
        // Navigate back to products page after successful update
        setTimeout(() => {
          router.push("/user/dashboard/product");
        }, 1500); // Wait 1.5 seconds to show the success toast before navigating
      } catch (error: any) {
        console.error("Failed to edit product (FormData):", error);
        showToast("Failed to update product", "error");
        console.error(
          "Error details:",
          error.response?.data || error.message
        );
        setApiError(
          error.response?.data?.message ||
            error.message ||
            "Failed to update product"
        );
      } finally {
        setIsSubmitting(false);
      }
    } else {
      console.error("Product ID is missing or invalid.");
      showToast("Invalid product ID", "error");
      setApiError("Product ID is missing or invalid.");
      setIsSubmitting(false);
    }
  };
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
    
    <div className="flex-1 p-4 md:p-6 bg-(neutral-100)-50 min-h-screen">
      {apiError && (
        <div className="mb-4 p-2 bg-red-100 text-red-800 rounded">
          {apiError}
        </div>
      )}
      
      {isLoadingProduct ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            <p className="mt-2 text-gray-600">Loading product details...</p>
          </div>
        </div>
      ) : !product ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-gray-600">Product not found or failed to load.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                Edit Product
              </h1>
              <p className="text-sm text-gray-500">
                Edit your product details below
              </p>
            </div>
          </div>
      <form
        id="edit-product-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
      >
        {/* Core Product Identity */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-600 font-semibold text-lg">
              Core Product Identity
            </CardTitle>
            <p className="text-sm text-gray-500">
              Classify the product for catalog structure, filterability, and
              business logic.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* No. of Stock */}
            <div className="space-y-2">
              <Label htmlFor="noOfStock" className="text-sm font-medium">
                No. of Stock
              </Label>
              <Input
                id="no_of_stock"
                type="number"
                step="1"
                min="0"
                placeholder="Enter No. of Stock"
                className="bg-gray-50 border-gray-200 rounded-[8px] p-4"
                {...register("no_of_stock", { valueAsNumber: true })}
              />
              {errors.no_of_stock && (
                <span className="text-red-500 text-sm">
                  {errors.no_of_stock.message}
                </span>
              )}
            </div>
            {/* Manufacturer Part Number */}
            <div className="space-y-2">
              <Label
                htmlFor="manufacturerPartNumber"
                className="text-sm font-medium"
              >
                Manufacturer Part Number (MPN)
              </Label>
              <Input
                id="manufacturer_part_name"
                placeholder="Part Number"
                className="bg-gray-50 border-gray-200 rounded-[8px] p-4"
                {...register("manufacturer_part_name")}
              />
              {errors.manufacturer_part_name && (
                <span className="text-red-500 text-sm">
                  {errors.manufacturer_part_name.message}
                </span>
              )}
            </div>
            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="productName" className="text-sm font-medium">
                Product Name
              </Label>
              <Input
                id="product_name"
                placeholder="Enter Product Name"
                className="bg-gray-50 border-gray-200 rounded-[8px] p-4"
                {...register("product_name")}
              />
              {errors.product_name && (
                <span className="text-red-500 text-sm">
                  {errors.product_name.message}
                </span>
              )}
            </div>
            {/* Brand */}

            {/* HSN Code */}
            <div className="space-y-2">
              <Label htmlFor="hsnCode" className="text-sm font-medium">
                HSN Code
              </Label>
              <Input
                id="hsn_code"
                placeholder="Enter HSN Code"
                className="bg-gray-50 border-gray-200 rounded-[8px] p-4"
                {...register("hsn_code")}
              />
              {errors.hsn_code && (
                <span className="text-red-500 text-sm">
                  {errors.hsn_code.message}
                </span>
              )}
            </div>
            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Category
              </Label>
              <Select
                value={watch("category") || ""}
                onValueChange={(value) => setValue("category", value)}
              >
                <SelectTrigger
                  id="category"
                  className="bg-gray-50 border-gray-200 rounded-[8px] p-4 w-full"
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.length === 0 ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : (
                    categoryOptions.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>
                        {cat.category_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.category && (
                <span className="text-red-500 text-sm">
                  {errors.category.message}
                </span>
              )}
            </div>
            {/* Sub-category */}
            <div className="space-y-2">
              <Label htmlFor="subCategory" className="text-sm font-medium">
                Sub-category
              </Label>
              <Select
                value={watch("sub_category") || ""}
                onValueChange={(value) => setValue("sub_category", value)}
              >
                <SelectTrigger
                  id="sub_category"
                  className="bg-gray-50 border-gray-200 rounded-[8px] p-4 w-full"
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {subCategoryOptions.length === 0 ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : (
                    subCategoryOptions.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>
                        {cat.subcategory_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.sub_category && (
                <span className="text-red-500 text-sm">
                  {errors.sub_category.message}
                </span>
              )}
            </div>
            {/* Product Type (OE, OEM, Aftermarket) */}
            <div className="space-y-2">
              <Label htmlFor="productType" className="text-sm font-medium">
                Product Type
              </Label>
              <Select
                value={watch("product_type") || ""}
                onValueChange={(value) => setValue("product_type", value)}
              >
                <SelectTrigger
                  id="productType"
                  className="bg-gray-50 border-gray-200 rounded-[8px] p-4 w-full"
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OE">OE</SelectItem>
                  <SelectItem value="OEM">OEM</SelectItem>
                  <SelectItem value="AfterMarket">Aftermarket</SelectItem>
                </SelectContent>
              </Select>
              {errors.product_type && (
                <span className="text-red-500 text-sm">
                  {errors.product_type.message}
                </span>
              )}
            </div>
            {/* Vehicle Type */}
            <div className="space-y-2">
              <Label htmlFor="vehicle_type" className="text-sm font-medium">
                Vehicle Type
              </Label>
              <Select
                value={watch("vehicle_type") || ""}
                onValueChange={(value) => {
                  setValue("vehicle_type", value);
                  setSelectedProductTypeId(value);
                }}
              >
                <SelectTrigger
                  id="vehicle_type"
                  className="bg-gray-50 border-gray-200 rounded-[8px] p-4 w-full"
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.length === 0 ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : (
                    typeOptions.map((type) => (
                      <SelectItem key={type._id} value={type._id}>
                        {type.type_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.vehicle_type && (
                <span className="text-red-500 text-sm">
                  {errors.vehicle_type.message}
                </span>
              )}
            </div>
            
          </CardContent>
        </Card>
        {/* Vehicle Compatibility */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-600 font-semibold text-lg">
              Vehicle Compatibility
            </CardTitle>
            <p className="text-sm text-gray-500">
              Specify which vehicle make, model, and variant the product is
              compatible with.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Brand */}
            <div className="space-y-2">
              <Label htmlFor="brand" className="text-sm font-medium">
                Brand
              </Label>
              <Select
                value={watch("brand") || ""}
                onValueChange={(value) => {
                  setValue("brand", value);

                  setSelectedBrandId(value);
                }}
              >
                <SelectTrigger
                  id="brand"
                  className="bg-gray-50 border-gray-200 rounded-[8px] p-4 w-full"
                >
                  <SelectValue placeholder="Select Product Type first" />
                </SelectTrigger>
                <SelectContent>
                  {!selectedProductTypeId ? (
                    <SelectItem value="no-type" disabled>
                      Please select product type first
                    </SelectItem>
                  ) : isLoadingBrands ? (
                    <SelectItem value="loading" disabled>
                      Loading brands...
                    </SelectItem>
                  ) : brandOptions.length === 0 ? (
                    <SelectItem value="no-brands" disabled>
                      No brands found
                    </SelectItem>
                  ) : (
                    brandOptions.map((brand) => (
                      <SelectItem key={brand._id} value={brand._id}>
                        {brand.brand_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.brand && (
                <span className="text-red-500 text-sm">
                  {errors.brand.message}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="make" className="text-sm font-medium">
                Make
              </Label>
              <Input
                id="make"
                placeholder="Enter Make"
                className="bg-gray-50 border-gray-200 rounded-[8px] p-4"
                {...register("make")}
              />
              {errors.make && (
                <span className="text-red-500 text-sm">
                  {errors.make.message}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="model" className="text-sm font-medium">
                Model
              </Label>
              <Select
                value={watch("model") || ""}
                onValueChange={(value) => {
                  setValue("model", value);

                  setModelId(value);
                }}
              >
                <SelectTrigger
                  id="model"
                  className="bg-gray-50 border-gray-200 rounded-[8px] p-4 w-full"
                >
                  <SelectValue placeholder="Select Brand first" />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.length === 0 ? (
                    <SelectItem value="loading" disabled>
                      {selectedbrandId ? "Loading..." : "Select Brand first"}
                    </SelectItem>
                  ) : (
                    modelOptions.map((model) => (
                      <SelectItem key={model._id} value={model._id}>
                        {model.model_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.model && (
                <span className="text-red-500 text-sm">
                  {errors.model.message}
                </span>
              )}
            </div>
                 {/* Variant */}
            <div className="space-y-2">
              <Label htmlFor="variant" className="text-sm font-medium">
                Variant
              </Label>
              <Select
                value={watch("variant") || ""}
                onValueChange={(value) => setValue("variant", value)}
              >
                <SelectTrigger
                  id="variant"
                  className="bg-gray-50 border-gray-200 rounded-[8px] p-4 w-full"
                >
                  <SelectValue placeholder="Select Model first" />
                </SelectTrigger>
                <SelectContent>
                  {varientOptions.length === 0 ? (
                    <SelectItem value="loading" disabled>
                      {modelId ? "Loading..." : "Select Model first"}
                    </SelectItem>
                  ) : (
                    varientOptions.map((variant) => (
                      <SelectItem key={variant._id} value={variant._id}>
                        {variant.variant_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.variant && (
                <span className="text-red-500 text-sm">
                  {errors.variant.message}
                </span>
              )}
            </div>
            {/* Year Range */}
            <div className="space-y-2">
              <Label htmlFor="yearRange" className="text-sm font-medium">
                Year Range
              </Label>
              <Select
                value={watch("year_range") || ""}
                onValueChange={(value) => setValue("year_range", value)}
              >
                <SelectTrigger
                  id="year_range"
                  className="bg-gray-50 border-gray-200 rounded-[8px] p-4 w-full"
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {yearRangeOptions.length === 0 ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : (
                    yearRangeOptions.map((year) => (
                      <SelectItem key={year._id} value={year._id}>
                        {year.year_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.year_range && (
                <span className="text-red-500 text-sm">
                  {errors.year_range.message}
                </span>
              )}
            </div>
       
            {/* Fitment Notes */}
            <div className="space-y-2">
              <Label htmlFor="fitmentNotes" className="text-sm font-medium">
                Fitment Notes
              </Label>
              <Input
                id="fitment_notes"
                placeholder="Enter Fitment Notes"
                className="bg-gray-50 border-gray-200 rounded-[8px] p-4"
                {...register("fitment_notes")}
              />
              {errors.fitment_notes && (
                <span className="text-red-500 text-sm">
                  {errors.fitment_notes.message}
                </span>
              )}
            </div>
            {/* Is Universal */}
            <div className="space-y-2">
              <Label htmlFor="isUniversal" className="text-sm font-medium">
                Is Universal
              </Label>
              <Select
                value={watch("is_universal") || ""}
                onValueChange={(value) => setValue("is_universal", value)}
              >
                <SelectTrigger
                  id="is_universal"
                  className="bg-gray-50 border-gray-200 rounded-[8px] p-4 w-full"
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
              {errors.is_universal && (
                <span className="text-red-500 text-sm">
                  {errors.is_universal.message}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        {/* Technical Specifications */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-600 font-semibold text-lg">
              Technical Specifications
            </CardTitle>
            <p className="text-sm text-gray-500">
              Add all relevant technical details to help users understand the
              product quality and features.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Weight */}
            <div className="space-y-2">
              <Label htmlFor="weight" className="text-sm font-medium">
                Weight (kg)
              </Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter Weight in kg"
                className="bg-gray-50 border-gray-200 rounded-[8px] p-4"
                {...register("weight")}
              />
              {errors.weight && (
                <span className="text-red-500 text-sm">
                  {errors.weight.message}
                </span>
              )}
            </div>
            {/* Certifications */}
            <div className="space-y-2">
              <Label htmlFor="certifications" className="text-sm font-medium">
                Certifications
              </Label>
              <Input
                id="certifications"
                placeholder="Enter Certifications"
                className="bg-gray-50 border-gray-200 rounded-[8px] p-4"
                {...register("certifications")}
              />
              {errors.certifications && (
                <span className="text-red-500 text-sm">
                  {errors.certifications.message}
                </span>
              )}
            </div>
            {/* Warranty */}
            <div className="space-y-2">
              <Label htmlFor="warranty" className="text-sm font-medium">
                Warranty
              </Label>
              <Input
                id="warranty"
                placeholder="Enter Warranty"
                className="bg-gray-50 border-gray-200 rounded-[8px] p-4"
                {...register("warranty")}
              />
              {errors.warranty && (
                <span className="text-red-500 text-sm">
                  {errors.warranty.message}
                </span>
              )}
            </div>
            {/* Is Consumable */}
            <div className="space-y-2">
              <Label htmlFor="isConsumable" className="text-sm font-medium">
                Is Consumable
              </Label>
              <Select
                value={watch("is_consumable") || ""}
                onValueChange={(value) => setValue("is_consumable", value)}
              >
                <SelectTrigger
                  id="is_consumable"
                  className="bg-gray-50 border-gray-200 rounded-[8px] p-4 w-full"
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
              {errors.is_consumable && (
                <span className="text-red-500 text-sm">
                  {errors.is_consumable.message}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        {/* Media & Documentation */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-600 font-semibold text-lg">
              Media & Documentation
            </CardTitle>
            <p className="text-sm text-gray-500">
              Upload product images, videos, and brochures to enhance product
              representation and credibility.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Images Upload with Preview */}
            <div className="space-y-2">
              <Label htmlFor="images" className="text-sm font-medium">
                Images
              </Label>
              <input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="bg-gray-50 border-gray-200 rounded-[8px] p-4 w-full"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {/* Existing images from backend, not removed */}
                {existingImages.map((src, idx) =>
                  removedExistingIndexes.includes(idx) ? null : (
                    <div key={"existing-" + idx} className="relative inline-block">
                      <img
                        src={src}
                        alt={`Existing ${idx + 1}`}
                        className="h-20 w-20 object-cover rounded"
                      />
                      <button
                        type="button"
                        className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                        onClick={() => setRemovedExistingIndexes((prev) => [...prev, idx])}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  )
                )}
                {/* New uploads */}
                {selectedImagePreviews.map((src, idx) => (
                  <div key={"new-" + idx} className="relative inline-block">
                    <img
                      src={src}
                      alt={`Preview ${idx + 1}`}
                      className="h-20 w-20 object-cover rounded"
                    />
                    <button
                      type="button"
                      className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      onClick={() => {
                        setSelectedImages((prev) => prev.filter((_, i) => i !== idx));
                        setSelectedImagePreviews((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {errors.images && (
                <span className="text-red-500 text-sm">
                  {errors.images.message}
                </span>
              )}
            </div>
            {/* Video URL */}
            <div className="space-y-2">
              <Label htmlFor="videoUrl" className="text-sm font-medium">
                Video URL
              </Label>
              <Input
                id="videoUrl"
                placeholder="Paste Link"
                className="bg-gray-50 border-gray-200 rounded-[8px] p-4"
                {...register("videoUrl")}
              />
              {errors.videoUrl && (
                <span className="text-red-500 text-sm">
                  {errors.videoUrl.message}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        {/* Pricing details */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-600 font-semibold text-lg">
              Pricing & Tax
            </CardTitle>
            <p className="text-sm text-gray-500">
              Provide the pricing and tax information required for listing and
              billing.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MRP (with gst) */}
            <div className="space-y-2">
              <Label htmlFor="mrp" className="text-sm font-medium">
                MRP (with GST)
              </Label>
              <Input
                id="mrp_with_gst"
                placeholder="Enter MRP"
                className="bg-gray-50 border-gray-200 rounded-[8px] p-4"
                {...register("mrp_with_gst")}
              />
              {errors.mrp_with_gst && (
                <span className="text-red-500 text-sm">
                  {errors.mrp_with_gst.message}
                </span>
              )}
            </div>
            {/* Selling Price */}
            <div className="space-y-2">
              <Label htmlFor="sellingPrice" className="text-sm font-medium">
                Selling Price
              </Label>
              <Input
                id="selling_price"
                type="number"
                step="1"
                min="0"
                placeholder="Enter Selling Price"
                className="bg-gray-50 border-gray-200 rounded-[8px] p-4"
                {...register("selling_price", { valueAsNumber: true })}
              />
              {errors.selling_price && (
                <span className="text-red-500 text-sm">
                  {errors.selling_price.message}
                </span>
              )}
            </div>
            {/* GST % */}
            <div className="space-y-2">
              <Label htmlFor="gst" className="text-sm font-medium">
                GST %
              </Label>
              <Input
                id="gst_percentage"
                placeholder="Enter GST"
                className="bg-gray-50 border-gray-200 rounded-[8px] p-4"
                {...register("gst_percentage")}
              />
              {errors.gst_percentage && (
                <span className="text-red-500 text-sm">
                  {errors.gst_percentage.message}
                </span>
              )}
            </div>
            {/* is_returnable */}
            <div className="space-y-2">
              <Label htmlFor="returnable" className="text-sm font-medium">
                Returnable
              </Label>
              <Input
                id="returnable"
                placeholder="Enter Returnable"
                className="bg-gray-50 border-gray-200 rounded-[8px] p-4"
                {...register("is_returnable")}
              />
              {errors.is_returnable && (
                <span className="text-red-500 text-sm">
                  {errors.is_returnable.message}
                </span>
              )}
            </div>
            {/* Return Policy */}
            <div className="space-y-2">
              <Label htmlFor="return_policy" className="text-sm font-medium">
                Return Policy
              </Label>
              <Input
                id="return_policy"
                placeholder="Enter Return Policy"
                className="bg-gray-50 border-gray-200 rounded-[8px] p-4"
                {...register("return_policy")}
              />
              {errors.return_policy && (
                <span className="text-red-500 text-sm">
                  {errors.return_policy.message}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        {/* Dealer-Level Mapping & Routing */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-600 font-semibold text-lg">
              Dealer-Level Mapping & Routing
            </CardTitle>
            <p className="text-sm text-gray-500">
              Dealer product quantity and quality
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Multiple Dealer Assignments */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Dealer Assignments {dealerAssignments.length > 0 && `(${dealerAssignments.length} assigned)`}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newAssignment = {
                      dealerId: "",
                      quantity: 1,
                      margin: 0,
                      priority: 0
                    };
                    setDealerAssignments([...dealerAssignments, newAssignment]);
                  }}
                  className="text-xs"
                >
                  + Add Dealer
                </Button>
              </div>
              
              {/* Debug Info - Remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                  <p>Available Dealers: {availableDealers.length}</p>
                  <p>Current Assignments: {dealerAssignments.length}</p>
                  {dealerAssignments.length > 0 && (
                    <div>
                      <p>Assignment Details:</p>
                      {dealerAssignments.map((assignment, idx) => (
                        <div key={idx} className="ml-2">
                          - Dealer ID: {assignment.dealerId}, Qty: {assignment.quantity}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {dealerAssignments.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-sm">No dealers assigned yet</p>
                  <p className="text-xs mt-1">Click "Add Dealer" to assign dealers to this product</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dealerAssignments.map((assignment, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Dealer Selection */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Dealer</Label>
                          <Select
                            value={assignment.dealerId}
                            onValueChange={(value) => {
                              const updated = [...dealerAssignments];
                              updated[index].dealerId = value;
                              setDealerAssignments(updated);
                            }}
                          >
                            <SelectTrigger className="bg-white border-gray-200 rounded-[6px] p-2 text-xs">
                              <SelectValue placeholder="Select dealer" />
                            </SelectTrigger>
                            <SelectContent>
                              {loadingDealers ? (
                                <SelectItem value="loading" disabled>
                                  Loading dealers...
                                </SelectItem>
                              ) : availableDealers.length === 0 ? (
                                <SelectItem value="no-dealers" disabled>
                                  No dealers available for this category
                                </SelectItem>
                              ) : (
                                availableDealers
                                  .filter(dealer => !dealerAssignments.some((a, i) => i !== index && a.dealerId === dealer._id))
                                  .map((dealer) => (
                                    <SelectItem key={dealer._id} value={dealer._id}>
                                      {dealer.legal_name} ({dealer.trade_name})
                                    </SelectItem>
                                  ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Quantity */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={assignment.quantity}
                            onChange={(e) => {
                              const updated = [...dealerAssignments];
                              updated[index].quantity = parseInt(e.target.value) || 1;
                              setDealerAssignments(updated);
                            }}
                            className="bg-white border-gray-200 rounded-[6px] p-2 text-xs"
                            placeholder="Qty"
                          />
                        </div>
                        
                        {/* Margin */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Margin %</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            value={assignment.margin || ""}
                            onChange={(e) => {
                              const updated = [...dealerAssignments];
                              updated[index].margin = parseFloat(e.target.value) || 0;
                              setDealerAssignments(updated);
                            }}
                            className="bg-white border-gray-200 rounded-[6px] p-2 text-xs"
                            placeholder="Margin"
                          />
                        </div>
                        
                        {/* Priority & Remove */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Priority</Label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              min="0"
                              value={assignment.priority || ""}
                              onChange={(e) => {
                                const updated = [...dealerAssignments];
                                updated[index].priority = parseInt(e.target.value) || 0;
                                setDealerAssignments(updated);
                              }}
                              className="bg-white border-gray-200 rounded-[6px] p-2 text-xs flex-1"
                              placeholder="Priority"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const updated = dealerAssignments.filter((_, i) => i !== index);
                                setDealerAssignments(updated);
                              }}
                              className="px-2 py-2 text-red-600 hover:bg-red-50"
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Current Dealer Assignments Summary */}
              {dealerAssignments.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Current Dealer Assignments:</h4>
                  <div className="space-y-2">
                    {dealerAssignments.map((assignment, index) => {
                      const dealer = availableDealers.find(d => d._id === assignment.dealerId);
                      return (
                        <div key={index} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                          <div className="flex-1">
                            <span className="font-medium">
                              {dealer ? `${dealer.legal_name} (${dealer.trade_name})` : `Dealer ID: ${assignment.dealerId}`}
                            </span>
                            {dealer && (
                              <span className="text-gray-500 ml-2">ID: {dealer._id}</span>
                            )}
                          </div>
                          <div className="flex gap-4 text-gray-600">
                            <span>Qty: {assignment.quantity}</span>
                            <span>Margin: {assignment.margin || 0}%</span>
                            <span>Priority: {assignment.priority || 0}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {/* Last Inquired At */}
            <div className="space-y-2">
              <Label htmlFor="LastinquiredAt" className="text-sm font-medium">
                Last Inquired At
              </Label>
              <Input
                id="LastinquiredAt"
                placeholder="Enter Last Inquired At"
                className="bg-gray-50 border-gray-200 rounded-[8px] p-4"
                {...register("LastinquiredAt")}
              />
              {errors.LastinquiredAt && (
                <span className="text-red-500 text-sm">
                  {errors.LastinquiredAt.message}
                </span>
              )}
            </div>
            {/* Admin Notes */}
            <div className="space-y-2">
              <Label htmlFor="admin_notes" className="text-sm font-medium">
                Admin Notes
              </Label>
              <Input
                id="admin_notes"
                placeholder="Enter Admin Notes"
                className="bg-gray-50 border-gray-200 rounded-[8px] p-4"
                {...register("admin_notes")}
              />
              {errors.admin_notes && (
                <span className="text-red-500 text-sm">
                  {errors.admin_notes.message}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        {/* SEO & Search Optimization */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-600 font-semibold text-lg">
              SEO & Search Optimization
            </CardTitle>
            <p className="text-sm text-gray-500">
              Optimize product visibility and search performance.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SEO Title */}
            <div className="space-y-2">
              <Label htmlFor="seo_title" className="text-sm font-medium">
                SEO Title
              </Label>
              <Input
                id="seo_title"
                placeholder="Enter SEO Title"
                className="bg-gray-50 border-gray-200 rounded-[8px] p-4"
                {...register("seo_title")}
              />
              {errors.seo_title && (
                <span className="text-red-500 text-sm">
                  {errors.seo_title.message}
                </span>
              )}
            </div>

            {/* Search Tags Array (Chips) */}
            <div className="space-y-2">
              <Label htmlFor="searchTagsArray" className="text-sm font-medium">
                Search Tags
              </Label>
              <TagsInput
                value={
                  Array.isArray(watch("search_tags"))
                    ? watch("search_tags")
                    : []
                }
                onChange={(tags: string[]) => setValue("search_tags", tags)}
                name="search_tags"
                placeHolder="Add tag and press enter"
              />
              {errors.search_tags && (
                <span className="text-red-500 text-sm">
                  {errors.search_tags.message}
                </span>
              )}
            </div>
            {/* SEO Description */}
            <div className="space-y-2 col-span-full">
              <Label htmlFor="seoDescription" className="text-sm font-medium">
                SEO Description
              </Label>
              <Input
                id="seo_description"
                placeholder="Enter SEO Description"
                className="bg-gray-50 border-gray-200 rounded-[8px] p-4"
                {...register("seo_description")}
              />
              {errors.seo_description && (
                <span className="text-red-500 text-sm">
                  {errors.seo_description.message}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg shadow-sm"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update Product"}
          </Button>
        </div>
      </form>
        </>
      )}
      
    </div>
  );
}
