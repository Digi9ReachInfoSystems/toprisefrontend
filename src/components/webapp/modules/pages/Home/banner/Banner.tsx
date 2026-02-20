"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useAppSelector } from "@/store/hooks";
import { selectVehicleTypeId } from "@/store/slice/vehicle/vehicleSlice";
import {
  getBrandsByType,
  getModelsByBrand,
  getVariantsByModel,
} from "@/service/product-Service";
import { getVehicleInfo } from "@/service/vehicle-info-service";
import { useToast } from "@/components/ui/toast";
import SearchModal from "../product-sections/module/SearchModal";
import PurchaseOrderDialog from "../../../UserSetting/popup/PurchaseOrderBox";
import { BiLogoPlayStore, BiLogoApple } from "react-icons/bi";

interface Model {
  _id: string;
  model_name: string;
  brand_id: string;
}

interface Variant {
  _id: string;
  variant_name: string;
  model_id: string;
}

interface Brand {
  _id: string;
  brand_name: string;
}

export default function BannerSection() {
  const [offsetY, setOffsetY] = useState(0);
  const handleScroll = () => setOffsetY(window.pageYOffset);

  // Vehicle search state
  const { showToast } = useToast();
  const router = useRouter();
  const typeId = useAppSelector(selectVehicleTypeId);

  // State for dropdown data
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);

  // State for selected values
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<string>("");

  // Number plate search
  const [numberPlate, setNumberPlate] = useState<string>("");
  const [isVehicleSearchLoading, setIsVehicleSearchLoading] =
    useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [isPODialogOpen, setIsPODialogOpen] = useState<boolean>(false);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch initial data when typeId changes
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [brandsRes] = await Promise.all([getBrandsByType(typeId)]);

        if (brandsRes.success && brandsRes.data) {
          const brandsData = Array.isArray(brandsRes.data)
            ? brandsRes.data
            : brandsRes.data || [];
          setBrands(brandsData as unknown as Brand[]);
        }

        // Reset all selections when vehicle type changes
        setSelectedBrand("");
        setSelectedModel("");
        setSelectedVariant("");
        setModels([]);
        setVariants([]);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        showToast("Failed to load initial data", "error");
      }
    };

    if (typeId) {
      fetchInitialData();
    }
  }, [typeId, showToast]);

  // Fetch models when brand changes
  useEffect(() => {
    const fetchModels = async () => {
      if (!selectedBrand) {
        setModels([]);
        setSelectedModel("");
        setSelectedVariant("");
        setVariants([]);
        return;
      }

      try {
        const modelsRes = await getModelsByBrand(selectedBrand);

        if (modelsRes.success && modelsRes.data) {
          const modelsData = Array.isArray(modelsRes.data)
            ? modelsRes.data
            : modelsRes.data.products || [];
          setModels(modelsData as Model[]);
        } else {
          setModels([]);
        }

        // Reset dependent selections
        setSelectedModel("");
        setSelectedVariant("");
        setVariants([]);
      } catch (error) {
        console.error("Error fetching models:", error);
        showToast("Failed to load models", "error");
        setModels([]);
      }
    };

    fetchModels();
  }, [selectedBrand, showToast]);

  // Fetch variants when model changes
  useEffect(() => {
    const fetchVariants = async () => {
      if (!selectedModel) {
        setVariants([]);
        setSelectedVariant("");
        return;
      }

      try {
        const variantsRes = await getVariantsByModel(selectedModel);

        if (variantsRes.success && variantsRes.data) {
          const variantsData = Array.isArray(variantsRes.data)
            ? variantsRes.data
            : variantsRes.data.products || [];
          setVariants(variantsData as Variant[]);
        } else {
          setVariants([]);
        }

        // Reset dependent selection
        setSelectedVariant("");
      } catch (error) {
        console.error("Error fetching variants:", error);
        showToast("Failed to load variants", "error");
        setVariants([]);
      }
    };

    fetchVariants();
  }, [selectedModel, showToast]);

  // Handle vehicle search
  const handleVehicleSearch = () => {
    if (!selectedBrand || !selectedModel) {
      showToast("Please select at least Brand and Model", "error");
      return;
    }

    // Get selected item names instead of IDs
    const selectedBrandName = brands.find(brand => brand._id === selectedBrand)?.brand_name;
    const selectedModelName = models.find(model => model._id === selectedModel)?.model_name;
    const selectedVariantName = selectedVariant
      ? variants.find(variant => variant._id === selectedVariant)?.variant_name
      : null;

    if (!selectedBrandName || !selectedModelName) {
      showToast("Invalid selection. Please try again.", "error");
      return;
    }

    // Build search query by combining names
    const searchQuery = `${selectedBrandName} ${selectedModelName} ${selectedVariantName || ""}`.trim();

    // Prepare params with query parameter instead of separate brand/model/variant
    const params = new URLSearchParams();
    params.set("query", searchQuery.replace(/\s+/g, "+"));
    if (typeId) params.set("vehicleTypeId", typeId);

    router.push(`/shop/search-results?${params.toString()}`);
  };

  // Handle number plate search
  const handleNumberPlateSearch = async () => {
    if (!numberPlate.trim()) {
      showToast("Please enter a number plate", "error");
      return;
    }

    setIsVehicleSearchLoading(true);

    try {
      // Call vehicle info API
      const vehicleInfo = await getVehicleInfo(numberPlate.trim());

      if (vehicleInfo.data) {
        const { apiData, dbMatches } = vehicleInfo.data;

        // Check if model exists in database
        if (!apiData.model) {
          showToast(
            "This model doesn't have any products at the moment",
            "error"
          );
          return;
        }

        // Build search query using vehicle details from API data
        const searchQuery =
          `${apiData.make} ${apiData.model} ${apiData.variant || ""}`.trim();

        const searchParams = new URLSearchParams({
          query: searchQuery,
          vehicleTypeId: typeId ?? "",
        });

        // Show success message with vehicle details
        showToast(`Found: ${apiData.description}`, "success");

        // Navigate to search results
        router.push(`/shop/search-results?${searchParams.toString()}`);
      } else {
        showToast(
          "Vehicle not found. Please check the registration number.",
          "error"
        );
      }
    } catch (error) {
      console.error("Vehicle search error:", error);
      showToast("Failed to search vehicle. Please try again.", "error");
    } finally {
      setIsVehicleSearchLoading(false);
    }
  };

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Background Image with Parallax Effect */}
      <div
        className="absolute inset-0 z-0"
        style={{ transform: `translateY(${offsetY * 0.5}px)` }}
      >
        <Image
          src="/assets/HeroBg.jpg"
          alt="Background"
          fill
          className="object-cover scale-110 blur-[1px] md:blur-[2px]"
          priority
        />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/60" />
        {/* Top gradient to blend with white navbar */}
        <div className="absolute inset-x-0 top-0 h-24 md:h-28 bg-linear-to-b from-white/45 to-transparent pointer-events-none" />
      </div>

      {/* Content Grid */}
      <div className="relative z-10 container mx-auto px-4 flex items-center min-h-[calc(100vh-100px)] py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center w-full">
          {/* Left Side - Text Content */}
          <div className="text-white space-y-6">
            <h1 className="font-sans font-bold text-white text-4xl md:text-5xl lg:text-6xl leading-tight">
            The right parts. The right price. Right on time.{" "}
            </h1>
            <p className="font-sans text-white/90 text-lg md:text-xl">
            Thousands of spares for bikes, scooters & cars. We deliver trust with genuine parts from authorised distributors at genuine prices, with pan-India shipping and same-day in NCR. 
            </p>
          </div>

          {/* Right Side - Search Form */}
          <div className="flex justify-center lg:justify-end">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 sm:p-6 w-full max-w-md space-y-6 shadow-2xl overflow-visible">
              {/* Vehicle Search Form */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold text-lg mb-4">
                  Search by vehicle
                </h3>

                <div className="flex flex-col gap-4">
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-700/80 backdrop-blur-sm text-white border border-gray-600 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/50 hover:bg-gray-600/80 transition-colors"
                  >
                    <option value="" className="bg-gray-800 text-white">
                      Select Brand
                    </option>
                    {brands.map((brand) => (
                      <option
                        key={brand._id}
                        value={brand._id}
                        className="bg-gray-800 text-white"
                      >
                        {brand.brand_name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={!selectedBrand}
                    className="w-full p-3 rounded-lg bg-gray-700/80 backdrop-blur-sm text-white border border-gray-600 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/50 hover:bg-gray-600/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="" className="bg-gray-800 text-white">
                      {selectedBrand ? "Select Model" : "Select Brand first"}
                    </option>
                    {models.map((model) => (
                      <option
                        key={model._id}
                        value={model._id}
                        className="bg-gray-800 text-white"
                      >
                        {model.model_name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedVariant}
                    onChange={(e) => setSelectedVariant(e.target.value)}
                    disabled={!selectedModel}
                    className="w-full p-3 rounded-lg bg-gray-700/80 backdrop-blur-sm text-white border border-gray-600 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/50 hover:bg-gray-600/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="" className="bg-gray-800 text-white">
                      {selectedModel ? "Select Variant" : "Select Model first"}
                    </option>
                    {variants.map((variant) => (
                      <option
                        key={variant._id}
                        value={variant._id}
                        className="bg-gray-800 text-white"
                      >
                        {variant.variant_name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleVehicleSearch}
                  disabled={!selectedBrand || !selectedModel}
                  className={`w-full font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg ${
                    selectedBrand && selectedModel
                      ? "bg-red-600 hover:bg-red-700 text-white hover:shadow-xl cursor-pointer"
                      : "bg-gray-500 text-gray-300 cursor-not-allowed opacity-60"
                  }`}
                >
                  Search
                </button>
              </div>

              {/* Number Plate Search */}
              <div className="space-y-4 pt-4 border-t border-white/20">
                <h3 className="text-white font-semibold">
                  Search by number plate
                </h3>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    placeholder="eg: DL 01 AB 1234 "
                    value={numberPlate}
                    onChange={(e) => setNumberPlate(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleNumberPlateSearch();
                      }
                    }}
                    className="flex-1 p-3 rounded-lg bg-gray-700/80 backdrop-blur-sm text-white border border-gray-600 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/50 placeholder-white/70 hover:bg-gray-600/80 transition-colors"
                  />
                  <button
                    onClick={handleNumberPlateSearch}
                    disabled={isVehicleSearchLoading}
                    className={`${
                      isVehicleSearchLoading
                        ? "bg-gray-500 cursor-not-allowed"
                        : "bg-red-600 hover:bg-red-700"
                    } text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl w-full md:w-auto`}
                  >
                    {isVehicleSearchLoading ? "Searching..." : "Search"}
                  </button>
                </div>
              </div>


              {/* Purchase Order Upload */}
              <div className="pt-4 border-t border-white/20">
                <button
                  onClick={() => setIsPODialogOpen(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Upload Purchase Request
                </button>
              </div>

              {/* App Download CTA */}
              <div className="pt-4 border-t border-white/20">
                <div className="flex justify-center lg:justify-end gap-4">
                  <a
                    href="https://apps.apple.com/in/app/toprise/id6748516348"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Download the TopRise app from App Store"
                    className="inline-flex items-center gap-3 bg-black hover:bg-gray-900 text-white font-medium py-3 px-5 rounded-lg transition-colors duration-200"
                  >
                    <BiLogoApple className="text-2xl" />
                    <div className="flex flex-col items-start">
                      <span className="text-xs">DOWNLOAD ON THE</span>
                      <span className="text-sm font-semibold">App Store</span>
                    </div>
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.dig9.toprise1&hl=en_IN"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Download the TopRise app from Google Play"
                    className="inline-flex items-center gap-3 bg-black hover:bg-gray-900 text-white font-medium py-3 px-5 rounded-lg transition-colors duration-200"
                  >
                    <BiLogoPlayStore className="text-2xl" />
                    <div className="flex flex-col items-start">
                      <span className="text-xs">GET IT ON</span>
                      <span className="text-sm font-semibold">Google Play</span>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Search Modal */}
      {typeId && (
        <SearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          vehicleTypeId={typeId}
          vehicleType="Vehicle"
        />
      )}

      <PurchaseOrderDialog 
        isOpen={isPODialogOpen} 
        onClose={() => setIsPODialogOpen(false)} 
      />

      {/* WhatsApp Widget */}
      <Script
        id="aisensy-wa-widget"
        src="https://d3mkw6s8thqya7.cloudfront.net/integration-plugin.js"
        strategy="afterInteractive"
        widget-id="aaay9o"
      />
    </section>
  );
}
