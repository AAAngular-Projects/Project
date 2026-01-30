import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  WritableSignal,
  computed,
  effect,
  signal,
  inject,
  OnDestroy,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  CreateMessagePayload,
  CreateMessageTemplatePayload,
  Message,
  RoleType,
  MessageQuery,
} from '../../core/models';
import { AuthService, MessageService } from '../../core/services';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagesComponent implements OnInit, OnDestroy {
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  // Messages state using signals
  private readonly messagesSignal = signal<Message[]>([]);
  private readonly isLoadingSignal = signal(false);
  private readonly errorSignal = signal<Error | null>(null);

  // Public computed signals
  readonly messages = this.messagesSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly hasError = computed(() => this.errorSignal() !== null);
  readonly error = this.errorSignal.asReadonly();
  
  // Role-based computed signals
  readonly currentUser = this.authService.currentUser;
  readonly userRole = this.authService.role;
  readonly isAuthenticated = this.authService.isAuthenticated;
  
  // Role checks for UI display
  readonly canCreateMessages = computed(() => {
    const role = this.userRole();
    return role === RoleType.ADMIN || role === RoleType.ROOT;
  });
  
  readonly canViewMessages = computed(() => {
    const role = this.userRole();
    return role === RoleType.USER || role === RoleType.ADMIN || role === RoleType.ROOT;
  });

  // Form for creating messages
  readonly createMessageForm: FormGroup = this.fb.group({
    sender: ['', Validators.required],
    recipient: ['', Validators.required],
    key: ['', Validators.required],
    templates: this.fb.array([this.createTemplateGroup()]),
  });

  readonly selectedMessage: WritableSignal<Message | null> = signal(null);
  readonly isCreatingMessage = signal(false);
  readonly createFormVisible = signal(false);

  // Computed values
  readonly unreadCount = computed(
    () => this.messages().filter((message: Message) => !message.readed).length,
  );

  // Auto-select first message effect
  private readonly autoSelectMessageEffect = effect(() => {
    const messages = this.messages();
    if (messages.length && !this.selectedMessage()) {
      this.selectedMessage.set(messages[0]);
    }
  });

  ngOnInit(): void {
    this.loadMessages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMessages(query: MessageQuery = { page: 1, take: 20, order: 'DESC' }): void {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    this.messageService.loadMessagesObservable(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.messagesSignal.set(response.data);
          this.isLoadingSignal.set(false);
        },
        error: (error) => {
          console.error('Error loading messages:', error);
          this.errorSignal.set(error);
          this.isLoadingSignal.set(false);
        }
      });
  }

  get templates(): FormArray<FormGroup> {
    return this.createMessageForm.get('templates') as FormArray<FormGroup>;
  }

  trackByUuid(_: number, item: Message): string {
    return item.uuid;
  }

  trackByIndex(index: number): number {
    return index;
  }

  selectMessage(message: Message): void {
    this.selectedMessage.set(message);

    if (!message.readed) {
      this.messageService.markAsReadObservable({ uuid: message.uuid })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // Update the message in our local state
            this.messagesSignal.update(messages => 
              messages.map(m => m.uuid === message.uuid ? { ...m, readed: true } : m)
            );
          },
          error: (error) => console.error('Error marking message as read:', error)
        });
    }
  }

  markAllAsRead(): void {
    this.messageService.markAsReadObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Update all messages as read in local state
          this.messagesSignal.update(messages => 
            messages.map(m => ({ ...m, readed: true }))
          );
        },
        error: (error) => console.error('Error marking all messages as read:', error)
      });
  }

  toggleCreateForm(): void {
    this.createFormVisible.update(visible => !visible);
    if (!this.createFormVisible()) {
      this.createMessageForm.reset();
      this.resetTemplatesArray();
    }
  }

  refreshMessages(): void {
    this.loadMessages();
  }

  addTemplate(): void {
    this.templates.push(this.createTemplateGroup());
  }

  removeTemplate(index: number): void {
    if (this.templates.length > 1) {
      this.templates.removeAt(index);
    }
  }

  submit(): void {
    if (this.createMessageForm.valid && !this.isCreatingMessage()) {
      this.isCreatingMessage.set(true);
      const payload = this.buildCreateMessagePayload();
      
      this.messageService.createMessageObservable(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (message) => {
            // Add the new message to the top of the list
            this.messagesSignal.update(messages => [message, ...messages]);
            this.createMessageForm.reset();
            this.resetTemplatesArray();
            this.createFormVisible.set(false);
            this.isCreatingMessage.set(false);
          },
          error: (error) => {
            console.error('Error creating message:', error);
            this.isCreatingMessage.set(false);
          }
        });
    } else {
      this.createMessageForm.markAllAsTouched();
    }
  }

  private resetTemplatesArray(): void {
    this.templates.clear();
    this.templates.push(this.createTemplateGroup());
  }

  private buildCreateMessagePayload(): CreateMessagePayload {
    const sender = (this.createMessageForm.get('sender')?.value as string).trim();
    const recipient = (this.createMessageForm.get('recipient')?.value as string).trim();
    const key = (this.createMessageForm.get('key')?.value as string).trim();

    const templates: CreateMessageTemplatePayload[] = this.templates.controls
      .map((group) => group.value)
      .map((template) => ({
        language: template.language?.trim(),
        subject: template.subject?.trim(),
        content: template.content?.trim(),
        actions: template.actions ? template.actions.trim() : undefined,
      }));

    return {
      sender,
      recipient,
      key,
      templates,
    } as CreateMessagePayload;
  }

  private createTemplateGroup(): FormGroup {
    return this.fb.group({
      language: ['', Validators.required],
      subject: ['', Validators.required],
      content: ['', Validators.required],
      actions: new FormControl<string | null>(null),
    });
  }
}
