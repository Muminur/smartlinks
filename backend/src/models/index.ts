/**
 * Mongoose Models Index
 *
 * This file exports all Mongoose models for easy importing throughout the application.
 *
 * Usage:
 * import { User, Link, Analytics, Domain, Plan, Payment } from './models';
 */

export { default as User, IUser, IUserDocument, IUserModel } from './user.model';
export { default as Link, ILink, ILinkDocument, ILinkModel } from './link.model';
export { default as Analytics, IAnalytics, IAnalyticsDocument, IAnalyticsModel } from './analytics.model';
export { default as Domain, IDomain, IDomainDocument, IDomainModel } from './domain.model';
export { default as Plan, IPlan, IPlanDocument, IPlanModel } from './plan.model';
export { default as Payment, IPayment, IPaymentDocument, IPaymentModel } from './payment.model';
