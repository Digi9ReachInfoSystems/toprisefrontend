import apiClient from "@/apiClient";
import { CartResponse } from "@/types/User/cart-Types";

export async function addToCart(data: any): Promise<CartResponse> {
  try {
    const response = await apiClient.post(`/orders/api/carts/addProduct`, data);
    return response.data;
  } catch (error) {
    console.error("Failed to add product to cart:", error);
    throw error;
  }
}

export async function getCart(id: string): Promise<CartResponse> {
  try {
    const response = await apiClient.get(`orders/api/carts/getCart/${id}`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch cart:", error);
    throw error;
  }
}

export async function addAddress(id: string, data: any): Promise<any> {
  try {
    const response = await apiClient.put(`/users/api/users/updateAddress/${id}`, data, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error("Failed to update address:", error);
    throw error;
  }
}

export async function createOrders(data: any): Promise<any> {
  try {
    const response = await apiClient.post(`/orders/api/orders/create`, data);
    return response.data;
  } catch (error) {
    console.error("Failed to create order:", error);
    throw error;
  }
}

export async function removeProductFromCart(data: any): Promise<any> {
  try {
    console.log("Removing product from cart:", data);
    const response = await apiClient.post(`/orders/api/carts/removeProduct`, data);
    console.log("Removed product from cart:", response.data);
    return response.data;
  } catch (err: any) {
    console.error("Failed to remove product from cart:", err);
    throw err;
  }
}

export async function increaseCartQuantity(userId: string, productId: string): Promise<CartResponse> {
  try {
    const response = await apiClient.put(`/orders/api/carts/update?action=increase`, {
      userId,
      productId
    });
    return response.data;
  } catch (error) {
    console.error("Failed to increase cart quantity:", error);
    throw error;
  }
}

export async function decreaseCartQuantity(userId: string, productId: string): Promise<CartResponse> {
  try {
    const response = await apiClient.put(`/orders/api/carts/update?action=decrease`, {
      userId,
      productId
    });
    return response.data;
  } catch (error) {
    console.error("Failed to decrease cart quantity:", error);
    throw error;
  }
}

// Check pincode availability
export async function checkPincode(pincode: string): Promise<{
  success: boolean;
  message: string;
  data: {
    available: boolean;
    pincode: string;
    city: string;
    state: string;
    district: string;
    area: string;
    delivery_available: boolean;
    delivery_charges: number;
    estimated_delivery_days: number;
    cod_available: boolean;
    status: string;
    message: string;
  };
}> {
  try {
    const response = await apiClient.get(`/category/api/pincodes/check/${pincode}`);
    return response.data;
  } catch (error) {
    console.error("Failed to check pincode:", error);
    throw error;
  }
}

// Update delivery type and charges
export async function updateDeliveryType(cartId: string, deliveryType: string): Promise<CartResponse> {
  try {
    const response = await apiClient.put(`/orders/api/carts/updateDelivery`, {
      cartId,
      deliveryType
    });
    return response.data;
  } catch (error) {
    console.error("Failed to update delivery type:", error);
    throw error;
  }
}