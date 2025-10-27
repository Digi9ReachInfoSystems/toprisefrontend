
/**
 * Represents a user object, often nested within an Employee object.
 */
export type User = {
  _id: string
  email: string
  phone_Number: string
  role: string
  username?: string
}

/**
 * Represents a dealer object as returned in assigned_dealers array.
 */
export type AssignedDealer = {
  _id: string
  dealerId: string
  legal_name: string
  trade_name: string
  GSTIN: string
  Pan: string
  Address: {
    street: string
    city: string
    pincode: string
    state: string
  }
  categories_allowed: string[]
  SLA_type: string
  dispatch_hours: any
  SLA_max_dispatch_time: number
  user_details: {
    _id: string
    email: string
    phone_Number: string
    role: string
  }
  created_at: string
  updated_at: string
  assigned_categories: Array<{
    _id: string
    category_name: string
  }>
}

/**
 * Represents an Employee object as returned by the API.
 */
export type Employee = {
  _id: string
  user_id: string | User
  employee_id: string
  First_name: string
  profile_image?: string
  mobile_number: string
  email: string
  role: string
  assigned_dealers: AssignedDealer[]
  assigned_regions: string[]
  last_login: string
  updated_at: string
  created_at: string
  __v?: number
  designation?: string
  department?: string
  status?: string
  active?: boolean
  accessLevel?: string
  roleDescription?: string
  sendLoginInvite?: boolean
  temporaryPassword?: string
  currentStatus?: string
  createdBy?: string
  assignedOrdersPicklists?: string
  slaType?: string
  slaMaxDispatchTime?: string
  remarks?: string
  auditTrail?: string
}

export type ApiResponse<T> = {
  success?: boolean
  message: string
  token?: string
  user?: User
  employee?: Employee
  data?: T
}

export type RevokeRoleResponse = {
  success: boolean;
  message: string;
  data: {
    ticketsAssigned: any[];
    cartId: string | null;
    fcmToken: string | null;
    wishlistId: string | null;
    _id: string;
    email: string;
    phone_Number: string;
    role: string;
    address: any[];
    __v: number;
    last_login: string;
    vehicle_details: any[];
  };
}

