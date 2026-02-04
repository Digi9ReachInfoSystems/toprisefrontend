"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CreditCard,
  Truck,
  Package,
  MapPin,
  Phone,
  Mail,
  User,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  ArrowLeft,
  Download,
  Printer,
  RotateCcw,
  Upload,
  Ticket,
  Star,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getProductById } from "@/service/product-Service";
import formatDate from "@/utils/formateDate";
import { Header } from "../../layout/Header";
import Footer from "../../../landingPage/module/Footer";
import { downloadInvoice } from "../../common/InvoiceDownloader";
import { createReturnRequest } from "@/service/return-service";
import { useToast } from "../../../ui/toast";
import { DynamicButton } from "../../../common/button";
import RiseTicket from "./popups/RiseTicket";
import OrderReviewModal from "../UserSetting/popup/OrderReviewModal";
import { addOrderRating } from "@/service/user/orderService";
import BankDetailsPromptModal from "./popups/BankDetailsPromptModal";
import { getBankDetails, getUserById } from "@/service/user/userService";
import { getUserIdFromToken } from "@/utils/auth";

interface OrderDetailsPageProps {
  order: any;
}

export default function OrderDetailsPage({ order }: OrderDetailsPageProps) {
  console.log("Order data:", order);

  // Calculate and log the breakdown
  const subtotal =
    (order.order_Amount || 0) - (order.GST || 0) - (order.deliveryCharges || 0);
  const gst = order.GST || 0;
  const deliveryCharges = order.deliveryCharges || 0;
  const grandTotal = order.order_Amount || 0;

  console.log("Order breakdown:", {
    subtotal,
    gst,
    deliveryCharges,
    grandTotal,
    verification: subtotal + gst + deliveryCharges === grandTotal,
  });
  const { showToast } = useToast();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnDescription, setReturnDescription] = useState("");
  const [returnImages, setReturnImages] = useState<File[]>([]);
  const [skuReturnQuantities, setSkuReturnQuantities] = useState<{
    [key: string]: number;
  }>({});
  const [returnLoading, setReturnLoading] = useState(false);
  const [selectedReturnSku, setSelectedReturnSku] = useState<string | null>(
    null
  );
  const [riseTicketModalOpen, setRiseTicketModalOpen] = useState(false);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [localOrder, setLocalOrder] = useState<any>(order);
  const [bankDetailsPromptOpen, setBankDetailsPromptOpen] = useState(false);
  const [checkingBankDetails, setCheckingBankDetails] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!order?.skus) {
        setLoading(false);
        return;
      }

      try {
        const productPromises = order.skus.map(async (sku: any) => {
          try {
            const response = await getProductById(sku.productId);
            const product = response.data.products[0]; // Get the first product from the array
            return {
              ...product,
              quantity: sku.quantity,
              sku: sku.sku,
              totalPrice:
                sku.totalPrice || product.selling_price * sku.quantity,
            };
          } catch (error) {
            console.error(`Failed to fetch product ${sku.productId}:`, error);
            return {
              _id: sku.productId,
              product_name: sku.productName || "Product not found",
              selling_price: 0,
              images: [],
              quantity: sku.quantity,
              sku: sku.sku,
              totalPrice: sku.totalPrice || 0,
            };
          }
        });

        const fetchedProducts = await Promise.all(productPromises);
        setProducts(fetchedProducts);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [order]);

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || "";
    switch (s) {
      case "delivered":
      case "completed":
        return "bg-green-100 text-green-800";
      case "shipped":
        return "bg-blue-100 text-blue-800";
      case "packed":
        return "bg-purple-100 text-purple-800";
      case "assigned":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "cancelled":
      case "canceled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    const s = status?.toLowerCase() || "";
    switch (s) {
      case "delivered":
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "shipped":
        return <Truck className="w-4 h-4" />;
      case "packed":
        return <Package className="w-4 h-4" />;
      case "assigned":
        return <Clock className="w-4 h-4" />;
      case "confirmed":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
      case "canceled":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const buildImageUrl = (path?: string) => {
    if (!path) return "/placeholder.svg";
    if (/^https?:\/\//i.test(path)) return path;
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const filesOrigin = apiBase.replace(/\/api$/, "");
    return `${filesOrigin}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const handleDownload = () => {
    const invoiceUrl = order.invoiceUrl;
    if (!invoiceUrl) return;
  
    window.open(invoiceUrl, "_blank", "noopener,noreferrer");
  };
  
  const isReturnEligible = (order: any, returnWindowDays?: number) => {
    // Check if order is delivered and within return window (using dynamic return_window_days)
    const deliveredStatus = ["delivered", "completed"].includes(
      order.status?.toLowerCase()
    );
    if (!deliveredStatus) return false;

    // If no returnWindowDays provided, cannot determine eligibility
    if (!returnWindowDays) return false;

    // Check if order has a delivery date and is within return window
    if (order.timestamps?.deliveredAt) {
      const deliveredDate = new Date(order.timestamps.deliveredAt);
      const currentDate = new Date();
      const daysSinceDelivery = Math.floor(
        (currentDate.getTime() - deliveredDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return daysSinceDelivery <= returnWindowDays;
    }

    return false;
  };

  const openReturnModal = () => {
    // Initialize quantities for all SKUs (excluding those with existing returns)
    const initialQuantities: { [key: string]: number } = {};
    order.skus.forEach((sku: any) => {
      // Set to 0 if return already exists, otherwise allow selection
      initialQuantities[sku.sku] = sku.return_info?.return_id ? 0 : 0;
    });
    setSkuReturnQuantities(initialQuantities);
    setReturnModalOpen(true);
  };

  const handleReturnProduct = async () => {
    // Check if payment method is COD
    if (order.paymentType === "COD") {
      // Check for bank details before allowing return
      const userId = getUserIdFromToken() || order.customerDetails?.userId;

      if (!userId) {
        showToast("User ID not found. Please login again.", "error");
        return;
      }

      try {
        setCheckingBankDetails(true);
        const bankResponse = await getUserById(userId);

        // Check if bank details exist (at least one field should be populated)
        const bankDetailsExist = bankResponse.data?.bank_details;

        if (!bankDetailsExist) {
          // Show bank details prompt modal
          setBankDetailsPromptOpen(true);
          setCheckingBankDetails(false);
          return;
        }
      } catch (error) {
        console.error("Failed to check bank details:", error);
        // If error fetching, assume bank details don't exist and show prompt
        setBankDetailsPromptOpen(true);
        setCheckingBankDetails(false);
        return;
      } finally {
        setCheckingBankDetails(false);
      }
    }

    // If not COD or bank details exist, proceed with normal return flow
    openReturnModal();
  };

  const handleBankDetailsAdded = () => {
    setBankDetailsPromptOpen(false);

    setTimeout(() => {
      if (selectedReturnSku) {
        setReturnModalOpen(true);
      } else {
        openReturnModal();
      }
    }, 100);
  };
  const handleReturnSku = async (sku: string, quantity: number) => {
    // Check if payment method is COD
    if (order.paymentType === "COD") {
      // Check for bank details before allowing return
      const userId = getUserIdFromToken() || order.customerDetails?.userId;

      if (!userId) {
        showToast("User ID not found. Please login again.", "error");
        return;
      }

      try {
        setCheckingBankDetails(true);
        const bankResponse = await getUserById(userId);

        // Check if bank details exist (at least one field should be populated)
        const bankDetailsExist = bankResponse.data?.bank_details;

        if (!bankDetailsExist) {
          // Show bank details prompt modal
          setBankDetailsPromptOpen(true);
          setCheckingBankDetails(false);
          // Store the SKU info for when bank details are added
          setSelectedReturnSku(sku);
          setSkuReturnQuantities({ [sku]: quantity });
          return;
        }
      } catch (error) {
        console.error("Failed to check bank details:", error);
        // If error fetching, assume bank details don't exist and show prompt
        setBankDetailsPromptOpen(true);
        setCheckingBankDetails(false);
        // Store the SKU info for when bank details are added
        setSelectedReturnSku(sku);
        setSkuReturnQuantities({ [sku]: quantity });
        return;
      } finally {
        setCheckingBankDetails(false);
      }
    }

    // If not COD or bank details exist, proceed with return flow
    setSelectedReturnSku(sku);
    setSkuReturnQuantities({ [sku]: quantity });
    setReturnModalOpen(true);
  };

  const handleSubmitReturn = async () => {
    if (!returnReason.trim()) {
      showToast("Please provide a reason for return", "error");
      return;
    }
    if (!returnDescription.trim()) {
      showToast("Please provide a description for return", "error");
      return;
    }

    // Get SKUs with quantities > 0
    const skusToReturn = Object.entries(skuReturnQuantities).filter(
      ([_, qty]) => qty > 0
    );

    if (skusToReturn.length === 0) {
      showToast(
        "Please select at least one product with quantity to return",
        "error"
      );
      return;
    }

    setReturnLoading(true);
    try {
      // Compress and convert images to base64 URLs
      let imageUrls: string[] = [];
      if (returnImages.length > 0) {
        const compressAndConvertImage = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                // Resize if too large (max 800px)
                const maxSize = 800;
                if (width > maxSize || height > maxSize) {
                  if (width > height) {
                    height = (height / width) * maxSize;
                    width = maxSize;
                  } else {
                    width = (width / height) * maxSize;
                    height = maxSize;
                  }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0, width, height);

                // Convert to base64 with compression (0.7 quality)
                const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
                resolve(compressedBase64);
              };
              img.onerror = reject;
              img.src = e.target?.result as string;
            };
            reader.onerror = reject;
          });
        };

        try {
          // Compress and convert all images
          const base64Promises = returnImages.map((file) =>
            compressAndConvertImage(file)
          );
          imageUrls = await Promise.all(base64Promises);
          console.log(
            "Compressed and converted images, count:",
            imageUrls.length
          );
          console.log(
            "Average image size:",
            Math.round(
              imageUrls.reduce((sum, url) => sum + url.length, 0) /
                imageUrls.length
            ),
            "characters"
          );
        } catch (conversionError) {
          console.error("Failed to process images:", conversionError);
          showToast(
            "Warning: Failed to process images, proceeding without them",
            "warning"
          );
          imageUrls = []; // Clear on error
        }
      }

      // Create return requests for each SKU
      const returnPromises = skusToReturn.map(([sku, quantity]) => {
        const returnData = {
          orderId: order._id,
          sku: sku,
          customerId: order.customerDetails.userId,
          quantity: String(quantity), // Convert to string as API expects
          returnReason: returnReason.trim(),
          returnDescription: returnDescription.trim(),
          returnImages: imageUrls, // Send the compressed base64 URLs
        };
        const payloadSize = JSON.stringify(returnData).length;
        console.log("Submitting return request:", {
          orderId: returnData.orderId,
          sku: returnData.sku,
          quantity: returnData.quantity,
          imagesCount: imageUrls.length,
          payloadSize: `${(payloadSize / 1024).toFixed(2)} KB`,
        });
        return createReturnRequest(returnData);
      });

      await Promise.all(returnPromises);

      showToast(
        `Return request${
          skusToReturn.length > 1 ? "s" : ""
        } submitted successfully! Our team will contact you shortly.`,
        "success"
      );

      setReturnModalOpen(false);
      setSelectedReturnSku(null);
      setReturnReason("");
      setReturnDescription("");
      setReturnImages([]);
      setImagePreviewUrls([]);
      setSkuReturnQuantities({});

      // Refresh the page to show updated return status
      window.location.reload();
    } catch (error: any) {
      console.error("Failed to submit return request:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to submit return request. Please try again.";
      console.error("Error details:", {
        status: error?.response?.status,
        data: error?.response?.data,
        message: errorMessage,
      });
      showToast(errorMessage, "error");
    } finally {
      setReturnLoading(false);
    }
  };

  const handleRiseTicket = () => {
    setRiseTicketModalOpen(true);
  };

  useEffect(() => {
    setLocalOrder(order);
  }, [order]);

  const handleOpenReviewModal = () => {
    setReviewModalOpen(true);
  };

  const handleCloseReviewModal = () => {
    setReviewModalOpen(false);
  };

  const handleSubmitReview = async (rating: number, review: string) => {
    if (!localOrder?._id) {
      showToast("Unable to submit review", "error");
      return;
    }

    try {
      setSubmittingReview(true);
      const response = await addOrderRating({
        orderId: localOrder._id,
        ratting: rating,
        review: review,
      });

      if (response.success) {
        showToast("Review submitted successfully", "success");
        setLocalOrder((prev: any) => ({
          ...prev,
          ratting: rating,
          review: review,
          review_Date: new Date().toISOString(),
        }));
        handleCloseReviewModal();
      } else {
        showToast(response.message || "Failed to submit review", "error");
      }
    } catch (error: any) {
      console.error("Failed to submit review:", error);
      showToast(error.message || "Failed to submit review", "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  const isDelivered = localOrder?.status?.toLowerCase() === "delivered";
  const hasReview = localOrder?.review && localOrder?.ratting;

  return (
    <div>
      <Header />
      <div className="min-h-screen bg-background">
        {/* Breadcrumb */}
        <div className="border-b border-border bg-card">
          <div className="max-w-screen-2xl mx-auto px-4 py-4 max-sm:px-3 max-sm:py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground max-sm:text-xs">
              <Link
                href="/"
                className="hover:text-primary cursor-pointer transition-colors"
              >
                Home
              </Link>

              <span>/</span>
              <span className="text-foreground">Order Details</span>
            </div>
          </div>
        </div>

        <div className="max-w-screen-2xl mx-auto px-4 py-8 max-sm:px-3 max-sm:py-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 max-sm:mb-4">
            <div className="flex items-center gap-4 max-sm:flex-col max-sm:items-start max-sm:gap-2 max-sm:w-full">
              <Link href="/profile">
                <Button
                  variant="outline"
                  size="sm"
                  className="max-sm:w-full max-sm:justify-start"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Shop
                </Button>
              </Link>
              <div className="max-sm:w-full">
                <h1 className="text-2xl font-bold text-gray-900 max-sm:text-xl">
                  Order Details
                </h1>
                <p className="text-gray-600 max-sm:text-sm truncate">
                  Order #{order.orderId}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 max-sm:flex-wrap max-sm:gap-2 max-sm:w-full">
              <Badge
                className={`px-3 py-1 ${getStatusColor(
                  order.status
                )} max-sm:text-xs max-sm:px-2`}
              >
                <div className="flex items-center gap-2 max-sm:gap-1">
                  {getStatusIcon(order.status)}
                  {order.status}
                </div>
              </Badge>
              <DynamicButton
                variant="outline"
                size="sm"
                onClick={handleRiseTicket}
                className="max-sm:flex-1 max-sm:text-xs"
              >
                <Ticket className="w-4 h-4 mr-2 max-sm:w-3 max-sm:h-3 max-sm:mr-1" />
                RAISE A TICKET
              </DynamicButton>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="max-sm:flex-1 max-sm:text-xs"
              >
                <Download className="w-4 h-4 mr-2 max-sm:w-3 max-sm:h-3 max-sm:mr-1" />
                Download Invoice
              </Button>
              {/* <Button
                variant="outline"
                size="sm"
                onClick={handleReturnProduct}
                disabled={
                  isReturnEligible(order) ||
                  order.skus?.every((sku: any) => sku.return_info?.return_id) ||
                  checkingBankDetails
                }
                className="max-sm:flex-1 max-sm:text-xs"
              >
                {checkingBankDetails ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin max-sm:w-3 max-sm:h-3" />
                    <span className="max-sm:hidden">Checking...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 max-sm:w-3 max-sm:h-3 max-sm:mr-1" />
                    <span className="max-sm:hidden">Return Product</span>
                    <span className="sm:hidden">Return</span>
                  </>
                )}
              </Button> */}
              {/* <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button> */}
            </div>
          </div>

          {/* Order Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 max-sm:grid-cols-1 max-sm:gap-4 max-sm:mb-4">
            <Card>
              <CardContent className="p-6 max-sm:p-4">
                <div className="flex items-center gap-4 max-sm:gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg max-sm:p-2">
                    <Calendar className="h-6 w-6 text-blue-600 max-sm:h-5 max-sm:w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-600 max-sm:text-xs">
                      Order Date
                    </p>
                    <p className="font-semibold text-gray-900 max-sm:text-sm truncate">
                      {order.orderDate
                        ? formatDate(order.orderDate, { includeTime: true })
                        : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 max-sm:p-4">
                <div className="flex items-center gap-4 max-sm:gap-3">
                  <div className="p-3 bg-green-100 rounded-lg max-sm:p-2">
                    <CreditCard className="h-6 w-6 text-green-600 max-sm:h-5 max-sm:w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 max-sm:text-xs">
                      Payment Method
                    </p>
                    <p className="font-semibold text-gray-900 max-sm:text-sm">
                      {order.paymentType || "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 max-sm:p-4">
                <div className="flex items-center gap-4 max-sm:gap-3">
                  <div className="p-3 bg-purple-100 rounded-lg max-sm:p-2">
                    <Truck className="h-6 w-6 text-purple-600 max-sm:h-5 max-sm:w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 max-sm:text-xs">
                      Delivery Type
                    </p>
                    <p className="font-semibold text-gray-900 max-sm:text-sm">
                      {order.type_of_delivery || "Standard"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 max-sm:p-4">
                <div className="flex items-center gap-4 max-sm:gap-3">
                  <div className="p-3 bg-orange-100 rounded-lg max-sm:p-2">
                    <Package className="h-6 w-6 text-orange-600 max-sm:h-5 max-sm:w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 max-sm:text-xs">
                      Total Amount
                    </p>
                    <p className="font-semibold text-gray-900 text-lg max-sm:text-base">
                      ₹{order.order_Amount?.toLocaleString() || "0"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-sm:gap-4">
            {/* Left Column - Customer & Delivery Info */}
            <div className="lg:col-span-2 space-y-6 max-sm:space-y-4">
              {/* Customer Information */}
              <Card>
                <CardHeader className="max-sm:px-4 max-sm:py-4">
                  <CardTitle className="flex items-center gap-2 max-sm:text-base">
                    <User className="h-5 w-5 max-sm:h-4 max-sm:w-4" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 max-sm:px-4 max-sm:pb-4 max-sm:space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-sm:grid-cols-1 max-sm:gap-3">
                    <div>
                      <p className="text-sm text-gray-600 mb-1 max-sm:text-xs">
                        Name
                      </p>
                      <p className="font-medium max-sm:text-sm">
                        {order.customerDetails?.name || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1 max-sm:text-xs">
                        Email
                      </p>
                      <p className="font-medium max-sm:text-sm truncate">
                        {order.customerDetails?.email || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1 max-sm:text-xs">
                        Phone
                      </p>
                      <p className="font-medium max-sm:text-sm">
                        {order.customerDetails?.phone || "-"}
                      </p>
                    </div>
                    {/* <div>
                    <p className="text-sm text-gray-600 mb-1">User ID</p>
                    <p className="font-medium text-sm">{order.customerDetails?.userId || '-'}</p>
                  </div> */}
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-gray-600 mb-2 flex items-center gap-2 max-sm:text-xs">
                      <MapPin className="h-4 w-4 max-sm:h-3 max-sm:w-3" />
                      Delivery Address
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg max-sm:p-3">
                      <p className="font-medium max-sm:text-sm">
                        {order.customerDetails?.address || "-"}
                      </p>
                      <p className="text-sm text-gray-600 max-sm:text-xs">
                        Pincode: {order.customerDetails?.pincode || "-"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardHeader className="max-sm:px-4 max-sm:py-4">
                  <CardTitle className="flex items-center gap-2 max-sm:text-base">
                    <Package className="h-5 w-5 max-sm:h-4 max-sm:w-4" />
                    Order Items ({products.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-sm:px-4 max-sm:pb-4">
                  {loading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 p-4 border rounded-lg"
                        >
                          <div className="w-16 h-16 bg-gray-200 rounded animate-pulse"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                          </div>
                          <div className="text-right space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                            <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Accordion type="multiple" className="w-full space-y-4">
                      {products.map((product, index) => {
                        const orderSku = order.skus?.find(
                          (s: any) => s.sku === product.sku
                        );
                        const hasReturn = orderSku?.return_info?.return_id;
                        const trackingInfo = orderSku?.tracking_info;
                        // Use SKU timestamps if available, otherwise fall back to order timestamps
                        const timestamps =
                          orderSku?.timestamps || order.timestamps;

                        // Determine item status from tracking_info or main order status
                        const itemStatus = trackingInfo?.status || "Processing";
                        const trackingStatus =
                          trackingInfo?.borzo_tracking_status;

                        // Build timeline steps for this specific item - only include steps with timestamps
                        const allTimelineSteps = [
                          {
                            label: "Order Created",
                            timestamp: timestamps?.createdAt,
                            icon: <CheckCircle className="h-4 w-4" />,
                          },
                          {
                            label: "Assigned",
                            timestamp: timestamps?.assignedAt,
                            icon: <User className="h-4 w-4" />,
                          },
                          {
                            label: "Packed",
                            timestamp: timestamps?.packedAt,
                            icon: <Package className="h-4 w-4" />,
                          },
                          {
                            label: "Shipped",
                            timestamp: timestamps?.shippedAt,
                            icon: <Package className="h-4 w-4" />,
                          },
                          {
                            label: "On The Way",
                            timestamp:
                              timestamps?.onTheWayToNextDeliveryPointAt,
                            icon: <Truck className="h-4 w-4" />,
                          },
                          {
                            label: "Out for Delivery",
                            timestamp: timestamps?.outForDeliveryAt,
                            icon: <Truck className="h-4 w-4" />,
                          },
                          {
                            label: "Delivered",
                            timestamp: timestamps?.deliveredAt,
                            icon: <CheckCircle className="h-4 w-4" />,
                          },
                          ...(order.status === "Cancelled" ||
                          order.status === "Canceled"
                            ? [
                                {
                                  label: "Cancelled",
                                  timestamp: order.updatedAt || order.createdAt,
                                  icon: <XCircle className="h-4 w-4" />,
                                  isCancelled: true,
                                },
                              ]
                            : []),
                        ];

                        // Add Borzo tracking status to timeline if available
                        if (
                          trackingInfo?.borzo_tracking_status &&
                          trackingInfo?.borzo_last_updated
                        ) {
                          const borzoStatusLabel =
                            trackingInfo.borzo_tracking_status === "finished"
                              ? "Delivered"
                              : trackingInfo.borzo_tracking_status;
                          allTimelineSteps.push({
                            label: borzoStatusLabel,
                            timestamp: trackingInfo.borzo_last_updated,
                            icon:
                              trackingInfo.borzo_tracking_status ===
                              "finished" ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <Truck className="h-4 w-4" />
                              ),
                          });
                        }

                        // Filter to only show steps that have timestamps and sort by timestamp
                        const timelineSteps = allTimelineSteps
                          .filter((step) => step.timestamp)
                          .sort(
                            (a, b) =>
                              new Date(a.timestamp).getTime() -
                              new Date(b.timestamp).getTime()
                          );

                        return (
                          <AccordionItem
                            key={index}
                            value={`item-${index}`}
                            className={`border rounded-lg ${
                              hasReturn
                                ? "bg-orange-50 border-orange-200"
                                : "border-border bg-card"
                            }`}
                          >
                            <AccordionTrigger className="hover:no-underline px-4 py-4 max-sm:px-3">
                              <div className="flex justify-between items-start w-full mr-4 gap-3 max-sm:flex-col max-sm:items-start">
                                <div className="flex gap-4 items-center flex-1 max-sm:gap-3">
                                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 max-sm:w-12 max-sm:h-12">
                                    <img
                                      src={orderSku?.product_image?.[0] || product?.images?.[0] || "/placeholder.svg"}
                                      alt={product.product_name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0 text-left">
                                    <h3 className="font-medium text-gray-900 max-sm:text-sm max-sm:line-clamp-2">
                                      {product.product_name}
                                    </h3>
                                    <p className="text-sm text-gray-600 max-sm:text-xs">
                                      SKU: {product.sku}
                                    </p>
                                    <p className="text-sm text-gray-600 max-sm:text-xs">
                                      Quantity: {product.quantity}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 flex-shrink-0 max-sm:w-full max-sm:flex-row max-sm:justify-between max-sm:items-center">
                                  <Badge
                                    className={`${
                                      order.status === "Cancelled" ||
                                      order.status === "Canceled"
                                        ? "bg-red-600"
                                        : "bg-green-600"
                                    } text-white max-sm:text-xs`}
                                  >
                                    {order.status === "Cancelled"
                                      ? "Cancelled"
                                      : trackingStatus === "finished"
                                      ? "Delivered"
                                      : itemStatus ===
                                        "On_The_Way_To_Next_Delivery_Point"
                                      ? "In Transit"
                                      : itemStatus === "OUT_FOR_DELIVERY"
                                      ? "Out for Delivery"
                                      : itemStatus}
                                  </Badge>
                                  <div className="text-right">
                                    <p className="font-semibold text-gray-900 max-sm:text-sm">
                                      ₹
                                      {product.totalPrice?.toLocaleString() ||
                                        "0"}
                                    </p>
                                    {/* <p className="text-sm text-gray-600 max-sm:text-xs">
                                      ₹
                                      {product.selling_price?.toLocaleString()/product.quantity}{" "}
                                      each
                                    </p> */}
                                  </div>
                                </div>
                              </div>
                            </AccordionTrigger>

                            <AccordionContent className="px-4 pb-4 max-sm:px-3">
                              <div className="space-y-4">
                                {/* Tracking Timeline - Only show if there are timestamps */}
                                {timelineSteps.length > 0 ? (
                                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 max-sm:p-3">
                                    <div className="relative py-2">
                                      {timelineSteps.map((step, stepIndex) => (
                                        <div
                                          key={stepIndex}
                                          className="relative flex gap-4 pb-8 last:pb-0"
                                        >
                                          {/* Timeline line */}
                                          {stepIndex !==
                                            timelineSteps.length - 1 && (
                                            <div
                                              className={`absolute left-[15px] top-[32px] h-full w-[2px] ${
                                                step.isCancelled
                                                  ? "bg-red-500"
                                                  : "bg-green-500"
                                              }`}
                                            />
                                          )}

                                          {/* Icon */}
                                          <div
                                            className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                                              step.isCancelled
                                                ? "border-red-500 bg-red-500"
                                                : "border-green-500 bg-green-500"
                                            } text-white`}
                                          >
                                            {step.icon}
                                          </div>

                                          {/* Content */}
                                          <div className="flex-1 pt-0.5">
                                            <h4
                                              className={`text-sm font-medium mb-1 ${
                                                step.isCancelled
                                                  ? "text-red-700"
                                                  : "text-green-700"
                                              }`}
                                            >
                                              {step.label}
                                            </h4>
                                            <p className="text-xs text-muted-foreground">
                                              {new Date(
                                                step.timestamp
                                              ).toLocaleString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              })}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    No tracking information available
                                  </p>
                                )}

                                {/* Return Button - Show if item is returnable and delivery is finished and within return window */}
                                {(() => {
                                  const deliveredAt =
                                    timestamps?.deliveredAt ||
                                    order.timestamps?.deliveredAt;
                                  const returnWindowDays =
                                    orderSku?.return_info?.return_window_days;

                                  // Only proceed if return_window_days is defined
                                  if (!returnWindowDays) return null;

                                  let withinReturnWindow = false;
                                  if (deliveredAt) {
                                    const daysSinceDelivery =
                                      (Date.now() -
                                        new Date(deliveredAt).getTime()) /
                                      (24 * 60 * 60 * 1000);
                                    withinReturnWindow =
                                      daysSinceDelivery <= returnWindowDays;
                                  } else {
                                    // If no deliveredAt, assume it's recent
                                    withinReturnWindow = true;
                                  }

                                  return (
                                    orderSku?.return_info?.is_returnable &&
                                    !orderSku?.return_info?.is_returned &&
                                    (trackingInfo?.borzo_tracking_status ===
                                      "finished" || trackingInfo?.borzo_tracking_status === "completed") &&
                                    withinReturnWindow && (
                                      <div className="flex justify-end">
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 h-auto"
                                          onClick={() =>
                                            handleReturnSku(
                                              product.sku,
                                              product.quantity
                                            )
                                          }
                                          disabled={checkingBankDetails}
                                        >
                                          {checkingBankDetails ? (
                                            <>
                                              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                              Checking...
                                            </>
                                          ) : (
                                            <>
                                              <RotateCcw className="h-3 w-3 mr-1.5" />
                                              Return
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    )
                                  );
                                })()}

                                {/* SKU-level Tracking Button */}
                                {trackingInfo?.borzo_tracking_url && (
                                  <div className="flex justify-end">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white text-xs px-3 py-1.5 h-auto"
                                      onClick={() =>
                                        window.open(
                                          trackingInfo.borzo_tracking_url,
                                          "_blank"
                                        )
                                      }
                                    >
                                      <Truck className="h-3 w-3 mr-1.5" />
                                      Track Package
                                    </Button>
                                  </div>
                                )}

                                {/* Already Returned Info */}
                                {orderSku?.return_info?.is_returned &&
                                  orderSku?.return_info?.return_id &&
                                  (() => {
                                    // Check if delivered within return window or if return window is still active
                                    // Try SKU timestamps first, then order timestamps
                                    const deliveredAt =
                                      timestamps?.deliveredAt ||
                                      order.timestamps?.deliveredAt;
                                    const returnWindowDays =
                                      orderSku?.return_info?.return_window_days;

                                    console.log("Return tracking check:", {
                                      sku: product.sku,
                                      deliveredAt,
                                      returnWindowDays,
                                      isReturned:
                                        orderSku?.return_info?.is_returned,
                                      returnId:
                                        orderSku?.return_info?.return_id,
                                    });

                                    // If deliveredAt and returnWindowDays exist, check if within return window
                                    let showTrackingButton = false;

                                    if (deliveredAt && returnWindowDays) {
                                      const daysSinceDelivery =
                                        (Date.now() -
                                          new Date(deliveredAt).getTime()) /
                                        (24 * 60 * 60 * 1000);
                                      showTrackingButton =
                                        daysSinceDelivery <= returnWindowDays;
                                      console.log(
                                        "Days since delivery:",
                                        daysSinceDelivery,
                                        "Return window days:",
                                        returnWindowDays,
                                        "Within window:",
                                        showTrackingButton
                                      );
                                    } else {
                                      // If no deliveredAt or returnWindowDays, assume it's recent and show tracking button
                                      showTrackingButton = true;
                                      console.log(
                                        "No deliveredAt or returnWindowDays found, showing tracking button by default"
                                      );
                                    }

                                    if (showTrackingButton) {
                                      // Show Order Tracking button
                                      return (
                                        <div className="flex justify-end">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white text-xs px-3 py-1.5 h-auto"
                                            onClick={() =>
                                              router.push(
                                                "/profile?tab=return%20requests"
                                              )
                                            }
                                          >
                                            <Package className="h-3 w-3 mr-1.5" />
                                            Order Tracking
                                          </Button>
                                        </div>
                                      );
                                    }

                                    // Show return info card if return window expired
                                    return (
                                      <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg border border-orange-200 dark:border-orange-800 max-sm:p-3">
                                        <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-2 flex items-center gap-2">
                                          <RotateCcw className="h-4 w-4" />
                                          Return Initiated
                                        </h4>
                                        <p className="text-xs text-orange-600 font-medium">
                                          Return ID:{" "}
                                          {orderSku.return_info.return_id}
                                        </p>
                                      </div>
                                    );
                                  })()}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Order Summary */}
            <div className="space-y-6 max-sm:space-y-4">
              <Card>
                <CardHeader className="max-sm:px-4 max-sm:py-4">
                  <CardTitle className="max-sm:text-base">
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 max-sm:px-4 max-sm:pb-4 max-sm:space-y-3">
                  <div className="flex justify-between max-sm:text-sm">
                    <span className="text-gray-600">Items Total (Inclusive GST)</span>
                    <span className="font-medium">
                      ₹{(order.order_Amount - order.deliveryCharges || 0).toLocaleString() || "0"}
                    </span>
                  </div>

                  <div className="flex justify-between max-sm:text-sm">
                    <span className="text-gray-600">GST </span>
                    <span className="font-medium">
                      ₹{order.GST?.toLocaleString() || "0"}
                    </span>
                  </div>

                  <div className="flex justify-between max-sm:text-sm">
                    <span className="text-gray-600">Delivery Charges</span>
                    <span className="font-medium">
                      {order.deliveryCharges > 0 ? (
                        <span className="text-black-500">
                          ₹{order.deliveryCharges?.toLocaleString() || "0"}
                        </span>
                      ) : (
                        <span className="text-black-500">Free Delivery</span>
                      )}
                    </span>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-semibold max-sm:text-base">
                    <span>Total (Inclusive of GST)</span>
                    <span>₹{order.order_Amount?.toLocaleString() || "0"}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Order Timeline */}
              {/* <Card>
                <CardHeader className="max-sm:px-4 max-sm:py-4">
                  <CardTitle className="max-sm:text-base">
                    Order Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-sm:px-4 max-sm:pb-4">
                  <div className="space-y-4 max-sm:space-y-3">
                    <div className="flex items-start gap-3 max-sm:gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 max-sm:mt-1.5"></div>
                      <div>
                        <p className="font-medium text-sm max-sm:text-xs">
                          Order Confirmed
                        </p>
                        <p className="text-xs text-gray-600 max-sm:text-[10px]">
                          {order.createdAt
                            ? formatDate(order.createdAt, { includeTime: true })
                            : "-"}
                        </p>
                      </div>
                    </div>

                    {order.timestamps?.assignedAt && (
                      <div className="flex items-start gap-3 max-sm:gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 max-sm:mt-1.5"></div>
                        <div>
                          <p className="font-medium text-sm max-sm:text-xs">
                            Order Assigned
                          </p>
                          <p className="text-xs text-gray-600 max-sm:text-[10px]">
                            {formatDate(order.timestamps.assignedAt, {
                              includeTime: true,
                            })}
                          </p>
                        </div>
                      </div>
                    )}

                    {order.timestamps?.packedAt && (
                      <div className="flex items-start gap-3 max-sm:gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 max-sm:mt-1.5"></div>
                        <div>
                          <p className="font-medium text-sm max-sm:text-xs">
                            Order Packed
                          </p>
                          <p className="text-xs text-gray-600 max-sm:text-[10px]">
                            {formatDate(order.timestamps.packedAt, {
                              includeTime: true,
                            })}
                          </p>
                        </div>
                      </div>
                    )}

                    {order.timestamps?.shippedAt && (
                      <div className="flex items-start gap-3 max-sm:gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 max-sm:mt-1.5"></div>
                        <div>
                          <p className="font-medium text-sm max-sm:text-xs">
                            Order Shipped
                          </p>
                          <p className="text-xs text-gray-600 max-sm:text-[10px]">
                            {formatDate(order.timestamps.shippedAt, {
                              includeTime: true,
                            })}
                          </p>
                        </div>
                      </div>
                    )}

                    {order.timestamps?.deliveredAt && (
                      <div className="flex items-start gap-3 max-sm:gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 max-sm:mt-1.5"></div>
                        <div>
                          <p className="font-medium text-sm max-sm:text-xs">
                            Order Delivered
                          </p>
                          <p className="text-xs text-gray-600 max-sm:text-[10px]">
                            {formatDate(order.timestamps.deliveredAt, {
                              includeTime: true,
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card> */}

              {/* Order Review Section */}
              {isDelivered && (
                <Card>
                  <CardHeader className="max-sm:px-4 max-sm:py-4">
                    <CardTitle className="flex items-center gap-2 max-sm:text-base">
                      <Star className="h-5 w-5 max-sm:h-4 max-sm:w-4" />
                      Order Review
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-sm:px-4 max-sm:pb-4">
                    {hasReview ? (
                      <div className="space-y-4 max-sm:space-y-3">
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-5 w-5 max-sm:h-4 max-sm:w-4 ${
                                star <= (localOrder.ratting || 0)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "fill-gray-200 text-gray-300"
                              }`}
                            />
                          ))}
                          <span className="ml-2 text-sm text-gray-600 max-sm:text-xs">
                            {localOrder.ratting}{" "}
                            {localOrder.ratting === 1 ? "star" : "stars"}
                          </span>
                        </div>
                        {localOrder.review && (
                          <div className="bg-gray-50 rounded-lg p-4 max-sm:p-3">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap max-sm:text-xs">
                              {localOrder.review}
                            </p>
                          </div>
                        )}
                        {localOrder.review_Date && (
                          <p className="text-xs text-gray-500 max-sm:text-[10px]">
                            Reviewed on{" "}
                            {formatDate(localOrder.review_Date, {
                              includeTime: true,
                            })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 max-sm:py-3">
                        <p className="text-sm text-gray-600 mb-4 max-sm:text-xs max-sm:mb-3">
                          Share your experience with this order
                        </p>
                        <Button
                          onClick={handleOpenReviewModal}
                          className="bg-red-600 hover:bg-red-700 text-white max-sm:w-full max-sm:text-sm"
                        >
                          <Star className="h-4 w-4 mr-2 max-sm:h-3 max-sm:w-3" />
                          Rate Order
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />

      {/* Return Product Modal */}
      <Dialog
        open={returnModalOpen}
        onOpenChange={(open) => {
          setReturnModalOpen(open);
          if (!open) {
            setSelectedReturnSku(null);
            setSkuReturnQuantities({});
            setReturnReason("");
            setReturnDescription("");
            setReturnImages([]);
            imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
            setImagePreviewUrls([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto max-sm:max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>
              {selectedReturnSku ? "Return Item" : "Return Products"}
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              {selectedReturnSku
                ? "Fill in the details for your return request"
                : "Select products and quantities you want to return"}
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Product Selection */}
            <div className="bg-gray-50 border rounded-lg p-4 space-y-4">
              <Label className="text-sm font-semibold text-gray-900">
                {selectedReturnSku
                  ? "Item to Return *"
                  : "Select Products to Return *"}
              </Label>

              {order.skus
                ?.filter(
                  (sku: any) =>
                    !selectedReturnSku || sku.sku === selectedReturnSku
                )
                .map((sku: any, index: number) => {
                  const product = products.find((p) => p.sku === sku.sku);
                  const currentQuantity = skuReturnQuantities[sku.sku] || 0;

                  return (
                    <div
                      key={sku.sku}
                      className="bg-white border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start gap-4">
                        {/* Product Image */}
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={sku?.product_image?.[0] || product?.images?.[0] || "/placeholder.svg"}
                            alt={product?.product_name || sku.productName}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-gray-900 truncate">
                              {product?.product_name ||
                                sku.productName ||
                                "Product"}
                            </h4>
                            {sku.return_info?.return_id && (
                              <Badge className="bg-orange-100 text-orange-800 text-xs shrink-0">
                                Return Initiated
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 font-mono">
                            SKU: {sku.sku}
                          </p>
                          <p className="text-sm text-gray-600">
                            Ordered: {sku.quantity} unit
                            {sku.quantity > 1 ? "s" : ""}
                          </p>
                          {sku.return_info?.return_id && (
                            <p className="text-xs text-orange-600 font-medium mt-1">
                              Return ID: {sku.return_info.return_id}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Quantity Selector */}
                      <div>
                        <Label
                          htmlFor={`quantity-${index}`}
                          className="text-sm text-gray-700"
                        >
                          Return Quantity
                        </Label>
                        {sku.return_info?.return_id ? (
                          <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
                            <p className="text-sm text-orange-800">
                              A return request has already been initiated for
                              this product.
                            </p>
                          </div>
                        ) : selectedReturnSku ? (
                          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-sm text-blue-800 font-medium">
                              Quantity: {currentQuantity}
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newQty = Math.max(0, currentQuantity - 1);
                                setSkuReturnQuantities((prev) => ({
                                  ...prev,
                                  [sku.sku]: newQty,
                                }));
                              }}
                              disabled={currentQuantity === 0}
                            >
                              -
                            </Button>
                            <input
                              id={`quantity-${index}`}
                              type="number"
                              min={0}
                              max={sku.quantity}
                              value={currentQuantity}
                              onChange={(e) => {
                                const newQty = Math.min(
                                  sku.quantity,
                                  Math.max(0, parseInt(e.target.value) || 0)
                                );
                                setSkuReturnQuantities((prev) => ({
                                  ...prev,
                                  [sku.sku]: newQty,
                                }));
                              }}
                              className="w-20 text-center px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newQty = Math.min(
                                  sku.quantity,
                                  currentQuantity + 1
                                );
                                setSkuReturnQuantities((prev) => ({
                                  ...prev,
                                  [sku.sku]: newQty,
                                }));
                              }}
                              disabled={currentQuantity >= sku.quantity}
                            >
                              +
                            </Button>
                            <span className="text-sm text-gray-500 ml-2">
                              Max: {sku.quantity}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <Separator />

            <div>
              <Label htmlFor="reason">Reason for Return *</Label>
              <input
                id="reason"
                placeholder="e.g., Defective, Wrong item, Not as described"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={100}
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Please provide detailed information about why you're returning this product..."
                value={returnDescription}
                onChange={(e) => setReturnDescription(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Images (Optional)</Label>
              <div className="mt-2 space-y-2">
                {imagePreviewUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {imagePreviewUrls.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative w-20 h-20 border rounded"
                      >
                        <img
                          src={img}
                          alt={`Return ${idx + 1}`}
                          className="w-full h-full object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newImages = returnImages.filter(
                              (_, i) => i !== idx
                            );
                            const newPreviews = imagePreviewUrls.filter(
                              (_, i) => i !== idx
                            );
                            setReturnImages(newImages);
                            setImagePreviewUrls(newPreviews);
                            // Revoke the removed preview URL
                            URL.revokeObjectURL(img);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {returnImages.length < 5 && (
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-gray-50">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm text-gray-600">
                      Upload Images ({returnImages.length}/5)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const maxFileSize = 5 * 1024 * 1024; // 5MB per file

                        // Filter out files that are too large
                        const validFiles = files.filter((file) => {
                          if (file.size > maxFileSize) {
                            showToast(
                              `${file.name} is too large. Maximum size is 5MB`,
                              "error"
                            );
                            return false;
                          }
                          return true;
                        });

                        const remainingSlots = 5 - returnImages.length;
                        const filesToAdd = validFiles.slice(0, remainingSlots);

                        if (filesToAdd.length > 0) {
                          // Create preview URLs
                          const newPreviewUrls = filesToAdd.map((file) =>
                            URL.createObjectURL(file)
                          );

                          setReturnImages((prev) => [...prev, ...filesToAdd]);
                          setImagePreviewUrls((prev) => [
                            ...prev,
                            ...newPreviewUrls,
                          ]);
                        }

                        // Reset input
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>
                )}
                <p className="text-xs text-gray-500">
                  Upload up to 5 images (JPG, PNG, max 5MB each). Images will be
                  compressed automatically.
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center gap-3 pt-4">
              <div className="text-sm text-gray-600">
                {Object.values(skuReturnQuantities).reduce(
                  (sum, qty) => sum + qty,
                  0
                ) > 0 && (
                  <span className="font-medium">
                    Returning{" "}
                    {Object.values(skuReturnQuantities).reduce(
                      (sum, qty) => sum + qty,
                      0
                    )}{" "}
                    item(s) from{" "}
                    {
                      Object.values(skuReturnQuantities).filter(
                        (qty) => qty > 0
                      ).length
                    }{" "}
                    product(s)
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReturnModalOpen(false);
                    setSelectedReturnSku(null);
                    setSkuReturnQuantities({});
                    setReturnReason("");
                    setReturnDescription("");
                    setReturnImages([]);
                    // Cleanup preview URLs
                    imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
                    setImagePreviewUrls([]);
                  }}
                  disabled={returnLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitReturn}
                  disabled={
                    returnLoading ||
                    !returnReason.trim() ||
                    !returnDescription.trim() ||
                    Object.values(skuReturnQuantities).reduce(
                      (sum, qty) => sum + qty,
                      0
                    ) === 0
                  }
                >
                  {returnLoading ? "Submitting..." : "Submit Return Request"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <RiseTicket
        open={riseTicketModalOpen}
        onClose={() => setRiseTicketModalOpen(false)}
        orderId={order._id}
        showOrderSelection={false}
      />
      <BankDetailsPromptModal
        isOpen={bankDetailsPromptOpen}
        onClose={() => setBankDetailsPromptOpen(false)}
        onBankDetailsAdded={handleBankDetailsAdded}
      />
      {localOrder?._id && (
        <OrderReviewModal
          isOpen={reviewModalOpen}
          onClose={handleCloseReviewModal}
          orderId={localOrder._id}
          onSubmit={handleSubmitReview}
        />
      )}
    </div>
  );
}
