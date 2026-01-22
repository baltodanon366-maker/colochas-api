import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  succeeded: boolean;
  title: string;
  message: string;
  data?: T;
  meta?: {
    page: number;
    take: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // Si la respuesta ya tiene el formato estándar, retornarla tal cual
        if (data && typeof data === 'object' && 'succeeded' in data) {
          return data as ApiResponse<T>;
        }

        // Si tiene paginación, extraer meta
        let meta: ApiResponse<T>['meta'] = undefined;
        let responseData = data;

        if (data && typeof data === 'object' && 'pagination' in data) {
          const { pagination, ...rest } = data as any;
          responseData = rest.data || rest;
          meta = {
            page: pagination.page,
            take: pagination.limit,
            itemCount: pagination.total,
            pageCount: pagination.totalPages,
            hasPreviousPage: pagination.page > 1,
            hasNextPage: pagination.page < pagination.totalPages,
          };
        }

        // Formato estándar de éxito
        const response: ApiResponse<T> = {
          succeeded: true,
          title: 'Operation successful',
          message: 'The operation was executed successfully.',
          data: responseData,
        };

        if (meta) {
          response.meta = meta;
        }

        return response;
      }),
    );
  }
}

