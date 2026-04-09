<template>
    <div class="min-h-full py-8 px-4">
        <div class="max-w-3xl mx-auto space-y-6">

            <!-- ── Page Header ── -->
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="flex items-center gap-2 text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Minha Conta
                        <Favorite class="my-auto ms-0" :router="'/settings/Account'" :section="'Minha Conta'" />
                    </h1>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Gerencie suas informações pessoais e segurança
                    </p>
                </div>
            </div>

            <!-- ── Profile Card ── -->
            <div
                class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">

                <!-- Profile Hero -->
                <div
                    class="relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-950/10 px-6 pt-6 pb-4">
                    <div class="flex items-start gap-4">
                        <!-- Avatar -->
                        <div class="relative shrink-0">
                            <img class="w-16 h-16 rounded-2xl object-cover ring-4 ring-white dark:ring-gray-900 shadow-md"
                                :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    (authStore.user?.username ?? '').split(' ').slice(0, 2).map(n => n[0]?.toUpperCase()).join(' ')
                                )}&background=random&size=128`" alt="avatar" />
                            <!-- Face ID badge -->
                            <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-900"
                                :class="authStore.user?.face_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'"
                                v-tippy="authStore.user?.face_enabled ? 'Reconhecimento facial ativo' : 'Reconhecimento facial inativo'">
                                <i class="fas fa-users-viewfinder text-white text-[8px]"></i>
                            </div>
                        </div>

                        <!-- Name & info -->
                        <div class="flex-1 min-w-0">
                            <h2 class="text-lg font-bold text-gray-900 dark:text-white truncate">
                                {{ authStore.user?.username }}
                            </h2>
                            <p class="text-sm text-gray-600 dark:text-gray-400">{{ authStore.user?.position || 'Cargo não definido' }}</p>
                            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{{ authStore.user?.city ||
                                'Cidade não informada' }}</p>
                        </div>

                        <!-- Edit toggle -->
                        <button @click="toggleDisabled"
                            class="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl font-medium transition-all duration-200"
                            :class="isDisabled
                                ? 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                : 'bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400'">
                            <i :class="isDisabled ? 'fas fa-pen text-[10px]' : 'fas fa-times text-[10px]'"></i>
                            {{ isDisabled ? 'Editar' : 'Cancelar' }}
                        </button>
                    </div>

                    <!-- Meta row -->
                    <div class="flex items-center gap-4 mt-4 pt-3 border-t border-black/5 dark:border-white/5">
                        <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <i class="fas fa-calendar-alt text-gray-400"></i>
                            Membro desde {{ new Date(authStore.user?.created_at).toLocaleDateString("pt-BR", {
                                day:
                                    '2-digit', month: 'long', year: 'numeric' }) }}
                        </div>
                        <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <i class="fas fa-clock text-gray-400"></i>
                            {{ calculateDaysInSystem() }} dias no sistema
                        </div>
                    </div>
                </div>

                <!-- Profile Form -->
                <form @submit.prevent="updateUser" class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

                        <!-- Nome -->
                        <div class="md:col-span-2 space-y-1.5">
                            <label
                                class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nome
                                Completo</label>
                            <Input v-model="editableUser.username" :disabled="isDisabled" type="text"
                                placeholder="Seu nome completo" required />
                        </div>

                        <!-- Email -->
                        <div class="space-y-1.5">
                            <label
                                class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</label>
                            <Input v-model="editableUser.email" :disabled="isDisabled" type="email"
                                placeholder="seu@email.com" required />
                        </div>

                        <!-- Telefone -->
                        <div class="space-y-1.5">
                            <label
                                class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Telefone <span class="text-gray-400 font-normal normal-case tracking-normal">(com DDD)</span></label>
                            <Input v-model="editableUser.phone" :disabled="isDisabled" type="tel"
                                placeholder="(11) 99999-9999" />
                        </div>

                        <!-- Nascimento -->
                        <div class="space-y-1.5">
                            <label
                                class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Data
                                de Nascimento</label>
                            <Input v-model="editableUser.birth_date" :disabled="isDisabled" type="date" required />
                        </div>

                        <!-- Cidade — sempre somente-leitura; edição apenas pelo administrador -->
                        <div class="space-y-1.5">
                            <label
                                class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cidade</label>
                            <div class="relative">
                                <Input v-model="editableUser.city" :disabled="true" type="text"
                                    placeholder="Cidade não informada" />
                                <span
                                    class="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400"
                                    v-tippy="'Editável somente pelo administrador'">
                                    <i class="fas fa-lock text-xs"></i>
                                </span>
                            </div>
                        </div>

                        <!-- Cargo — visível e obrigatório apenas para admin -->
                        <div v-if="isAdmin" class="space-y-1.5">
                            <label
                                class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                Cargo <span class="text-red-400">*</span>
                            </label>
                            <UiSelect v-if="!isDisabled" v-model="editableUser.position"
                                :options="positionsOptions" placeholder="Selecione o cargo" required />
                            <Input v-else v-model="editableUser.position" :disabled="true" type="text"
                                placeholder="Seu cargo" />
                            <transition name="fade">
                                <div v-if="selectedPositionDesc && !isDisabled"
                                    class="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                                    <i class="fas fa-circle-info text-blue-400 text-xs mt-0.5 shrink-0"></i>
                                    <p class="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{{ selectedPositionDesc }}</p>
                                </div>
                            </transition>
                        </div>
                        <!-- Face ID row (edit mode only) -->
                        <transition name="fade">
                            <div v-if="!isDisabled"
                                class="md:col-span-2 flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                                <div class="flex items-center gap-3">
                                    <div class="w-9 h-9 rounded-xl flex items-center justify-center"
                                        :class="editableUser.face_enabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-200 dark:bg-gray-700'">
                                        <i class="fas fa-users-viewfinder text-sm"
                                            :class="editableUser.face_enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400'"></i>
                                    </div>
                                    <div>
                                        <p class="text-sm font-medium text-gray-800 dark:text-gray-200">Reconhecimento
                                            Facial</p>
                                        <p class="text-xs text-gray-500 dark:text-gray-400">{{ editableUser.face_enabled
                                            ? 'Ativo — login por câmera habilitado' : 'Inativo' }}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <FacialAuth class="shrink-0">
                                        {{ authStore.user?.face_enabled ? 'Recadastrar' : 'Cadastrar' }}
                                    </FacialAuth>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" v-model="editableUser.face_enabled"
                                            class="sr-only peer" />
                                        <div class="w-10 h-5 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:bg-blue-600
                      after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                      after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
                      peer-checked:after:translate-x-5 peer-focus:ring-2 peer-focus:ring-blue-500/30"></div>
                                    </label>
                                </div>
                            </div>
                        </transition>
                    </div>

                    <!-- Actions -->
                    <transition name="fade">
                        <div v-if="!isDisabled"
                            class="flex gap-3 mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
                            <Button type="submit" :disabled="profileLoading">
                                <i class="fas fa-check mr-2 text-xs"></i>
                                {{ profileLoading ? 'Salvando...' : 'Salvar alterações' }}
                            </Button>
                            <Button type="button" outlined @click="cancelEdit">
                                Cancelar
                            </Button>
                        </div>
                    </transition>
                </form>
            </div>

            <!-- ── Change Password Card ── -->
            <div
                class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                <!-- Card header / toggle -->
                <button type="button"
                    class="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    @click="togglePasswordSection">
                    <div class="flex items-center gap-3">
                        <div
                            class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <i class="fas fa-lock text-sm text-amber-600 dark:text-amber-400"></i>
                        </div>
                        <div class="text-left">
                            <p class="text-sm font-semibold text-gray-900 dark:text-white">Alterar Senha</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">Atualize sua senha de acesso</p>
                        </div>
                    </div>
                    <i class="fas fa-chevron-down text-gray-400 text-xs transition-transform duration-200"
                        :class="{ 'rotate-180': passwordSectionOpen }"></i>
                </button>

                <!-- Password form (collapsible) -->
                <transition name="expand">
                    <div v-if="passwordSectionOpen" class="px-6 pb-6 border-t border-gray-100 dark:border-gray-800">
                        <form @submit.prevent="handleChangePassword" class="pt-5 space-y-4">

                            <!-- Current password -->
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Senha Atual
                                </label>
                                <div class="relative">
                                    <Input v-model="passwordForm.current"
                                        :type="showPasswords.current ? 'text' : 'password'"
                                        placeholder="Digite sua senha atual" required autocomplete="current-password" />
                                    <button type="button"
                                        class="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white"
                                        @click="showPasswords.current = !showPasswords.current">
                                        <i :class="showPasswords.current ? 'fas fa-eye-slash' : 'fas fa-eye'"
                                            class="text-sm"></i>
                                    </button>
                                </div>
                            </div>

                            <!-- Divider -->
                            <div class="border-t border-dashed border-gray-200 dark:border-gray-700 my-1"></div>

                            <!-- New password -->
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Nova Senha
                                </label>
                                <div class="relative">
                                    <Input v-model="passwordForm.new"
                                        :type="showPasswords.new ? 'text' : 'password'"
                                        placeholder="Mínimo 8 caracteres" required autocomplete="new-password" />
                                    <button type="button"
                                        class="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white"
                                        @click="showPasswords.new = !showPasswords.new">
                                        <i :class="showPasswords.new ? 'fas fa-eye-slash' : 'fas fa-eye'"
                                            class="text-sm"></i>
                                    </button>
                                </div>

                                <!-- Strength bar + checklist -->
                                <transition name="fade">
                                    <div v-if="passwordForm.new" class="mt-2 space-y-2">
                                        <!-- Bar -->
                                        <div class="flex gap-1">
                                            <div v-for="n in 4" :key="n"
                                                class="h-1 flex-1 rounded-full transition-all duration-300"
                                                :class="strengthBarColor(n)" />
                                        </div>
                                        <!-- Checks -->
                                        <div class="grid grid-cols-2 gap-1">
                                            <div v-for="check in passwordCheckList" :key="check.key"
                                                class="flex items-center gap-1.5 text-xs transition-colors"
                                                :class="newPasswordChecks[check.key] ? 'text-green-600 dark:text-green-400' : 'text-gray-400'">
                                                <i class="text-[10px] w-3 shrink-0"
                                                    :class="newPasswordChecks[check.key] ? 'fas fa-check-circle text-green-500' : 'far fa-circle'"></i>
                                                {{ check.label }}
                                            </div>
                                        </div>
                                    </div>
                                </transition>
                            </div>

                            <!-- Confirm new password -->
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Confirmar Nova Senha
                                </label>
                                <div class="relative">
                                    <Input v-model="passwordForm.confirm"
                                        :type="showPasswords.confirm ? 'text' : 'password'"
                                        placeholder="Repita a nova senha" required autocomplete="new-password" />
                                    <button type="button"
                                        class="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white"
                                        @click="showPasswords.confirm = !showPasswords.confirm">
                                        <i :class="showPasswords.confirm ? 'fas fa-eye-slash' : 'fas fa-eye'"
                                            class="text-sm"></i>
                                    </button>
                                </div>
                                <transition name="fade">
                                    <p v-if="passwordForm.confirm && !newPasswordChecks.match"
                                        class="text-xs text-red-500 mt-1">
                                        <i class="fas fa-exclamation-circle mr-1"></i>As senhas não coincidem.
                                    </p>
                                    <p v-else-if="passwordForm.confirm && newPasswordChecks.match"
                                        class="text-xs text-green-600 dark:text-green-400 mt-1">
                                        <i class="fas fa-check-circle mr-1"></i>Senhas coincidem.
                                    </p>
                                </transition>
                            </div>

                            <!-- Submit -->
                            <div class="pt-2">
                                <Button type="submit" :disabled="passwordLoading || !canSubmitPassword">
                                    <i class="fas fa-shield-halved mr-2 text-xs"></i>
                                    {{ passwordLoading ? 'Alterando...' : 'Alterar senha' }}
                                </Button>
                            </div>

                        </form>
                    </div>
                </transition>
            </div>

            <!-- ── Banner: senha alterada com sucesso ── -->
            <transition name="fade">
                <div v-if="passwordSuccessBanner.visible"
                    class="bg-white dark:bg-gray-900 rounded-2xl border border-green-200 dark:border-green-800 overflow-hidden shadow-sm">
                    <div class="px-6 py-4 flex items-start gap-4">
                        <div class="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                            <i class="fas fa-circle-check text-green-600 dark:text-green-400 text-sm"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold text-gray-900 dark:text-white">Senha alterada com sucesso!</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3">Copie sua nova senha antes que este aviso desapareça.</p>
                            <div class="flex items-center gap-2">
                                <div class="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-sm text-gray-900 dark:text-white tracking-wider truncate">
                                    {{ passwordSuccessBanner.password }}
                                </div>
                                <button type="button" @click="copyChangedPassword"
                                    class="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all"
                                    :class="passwordSuccessBanner.copied
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'">
                                    <i :class="passwordSuccessBanner.copied ? 'fas fa-check' : 'fas fa-copy'" class="text-xs"></i>
                                    {{ passwordSuccessBanner.copied ? 'Copiado!' : 'Copiar' }}
                                </button>
                                <button type="button" @click="dismissPasswordBanner"
                                    class="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                                    <i class="fas fa-times text-xs"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </transition>

            <!-- ── Microsoft Card ── -->
            <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                <button type="button"
                    class="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    @click="microsoftSectionOpen = !microsoftSectionOpen">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl flex items-center justify-center"
                            :class="microsoftStore.connected ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'">
                            <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg"
                                :class="microsoftStore.connected ? 'opacity-100' : 'opacity-40'">
                                <rect x="0" y="0" width="10" height="10" fill="#F25022"/>
                                <rect x="11" y="0" width="10" height="10" fill="#7FBA00"/>
                                <rect x="0" y="11" width="10" height="10" fill="#00A4EF"/>
                                <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
                            </svg>
                        </div>
                        <div class="text-left">
                            <p class="text-sm font-semibold text-gray-900 dark:text-white">Conta Microsoft</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                <span v-if="microsoftStore.connected" class="text-blue-600 dark:text-blue-400">
                                    <i class="fas fa-circle-check mr-1"></i>Conectada — {{ authStore.user?.email }}
                                </span>
                                <span v-else>Não conectada — faça login com sua conta @menin.com.br</span>
                            </p>
                        </div>
                    </div>
                    <i class="fas fa-chevron-down text-gray-400 text-xs transition-transform duration-200"
                        :class="{ 'rotate-180': microsoftSectionOpen }"></i>
                </button>

                <transition name="expand">
                    <div v-if="microsoftSectionOpen" class="px-6 pb-6 border-t border-gray-100 dark:border-gray-800">
                        <div class="mt-4 space-y-4">

                            <!-- Conectado -->
                            <template v-if="microsoftStore.connected">
                                <div class="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
                                    <i class="fas fa-circle-check mr-1.5"></i>
                                    Sua conta Microsoft está vinculada. O sistema usa ela para autenticar e acessar recursos do ecossistema Microsoft (SharePoint, Teams, etc.) em seu nome.
                                </div>

                                <div v-if="!microsoftStore.isMicrosoftOnly || authStore.isInternal" class="pt-1">
                                    <Button type="button" outlined :disabled="microsoftStore.loading" @click="handleUnlink">
                                        <i class="fas fa-unlink mr-2 text-xs"></i>
                                        {{ microsoftStore.loading ? 'Desvinculando...' : 'Desvincular conta Microsoft' }}
                                    </Button>
                                </div>
                                <p v-else class="text-xs text-amber-600 dark:text-amber-400">
                                    <i class="fas fa-triangle-exclamation mr-1"></i>
                                    Esta é sua única forma de login — não é possível desvincular sem configurar uma senha.
                                </p>
                            </template>

                            <!-- Não conectado -->
                            <template v-else>
                                <div class="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                                    <i class="fas fa-info-circle mr-1.5"></i>
                                    Conecte sua conta <strong>@menin.com.br</strong> para habilitar login simplificado e integração com SharePoint, Teams e outros serviços Microsoft.
                                </div>
                                <Button type="button" @click="microsoftStore.redirectToLogin()">
                                    <svg class="mr-2" width="14" height="14" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect x="0" y="0" width="10" height="10" fill="#F25022"/>
                                        <rect x="11" y="0" width="10" height="10" fill="#7FBA00"/>
                                        <rect x="0" y="11" width="10" height="10" fill="#00A4EF"/>
                                        <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
                                    </svg>
                                    Conectar conta Microsoft
                                </Button>
                            </template>

                        </div>
                    </div>
                </transition>
            </div>

            <!-- ── Sienge Credentials Card ── -->
            <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                <!-- Card header / toggle -->
                <button type="button"
                    class="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    @click="toggleSiengeSection">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl flex items-center justify-center p-1.5"
                            :class="siengeStatus?.hasCredentials ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-gray-800'">
                            <img src="/sienge.png" alt="Sienge"
                                class="w-full h-full object-contain"
                                :class="siengeStatus?.hasCredentials ? 'opacity-100' : 'opacity-40'" />
                        </div>
                        <div class="text-left">
                            <p class="text-sm font-semibold text-gray-900 dark:text-white">Credenciais Sienge</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                <span v-if="siengeStatus?.hasCredentials" class="text-red-600 dark:text-red-400">
                                    <i class="fas fa-circle-check mr-1"></i>Configurado — {{ siengeStatus.maskedEmail }}
                                </span>
                                <span v-else>Não configurado — necessário para criar contratos automaticamente</span>
                            </p>
                        </div>
                    </div>
                    <i class="fas fa-chevron-down text-gray-400 text-xs transition-transform duration-200"
                        :class="{ 'rotate-180': siengeSectionOpen }"></i>
                </button>

                <transition name="expand">
                    <div v-if="siengeSectionOpen" class="px-6 pb-6 border-t border-gray-100 dark:border-gray-800">
                        <!-- LGPD notice -->
                        <div class="mt-4 mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
                            <i class="fas fa-shield-halved mr-1.5"></i>
                            <strong>Privacidade e segurança:</strong> Suas credenciais Sienge são criptografadas com AES-256 antes de serem armazenadas e nunca são compartilhadas com outros usuários. Apenas você pode utilizá-las para criar contratos automaticamente no Sienge.
                        </div>
                        <form @submit.prevent="handleSaveSiengeCredentials" class="space-y-4">
                            <div class="space-y-1.5">
                                <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    E-mail Sienge
                                </label>
                                <Input v-model="siengeForm.email" type="email" placeholder="seu@email.com" required autocomplete="off" />
                            </div>
                            <div class="space-y-1.5">
                                <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Senha Sienge
                                </label>
                                <div class="relative">
                                    <Input v-model="siengeForm.password"
                                        :type="showSiengePassword ? 'text' : 'password'"
                                        placeholder="Sua senha do Sienge" required autocomplete="new-password" />
                                    <button type="button"
                                        class="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white"
                                        @click="showSiengePassword = !showSiengePassword">
                                        <i :class="showSiengePassword ? 'fas fa-eye-slash' : 'fas fa-eye'" class="text-sm"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="space-y-1.5">
                                <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Confirmar Senha Sienge
                                </label>
                                <Input v-model="siengeForm.confirmPassword"
                                    :type="showSiengePassword ? 'text' : 'password'"
                                    placeholder="Repita a senha" required autocomplete="new-password" />
                                <p v-if="siengeForm.confirmPassword && siengeForm.password !== siengeForm.confirmPassword"
                                    class="text-xs text-red-500 mt-1">
                                    <i class="fas fa-exclamation-circle mr-1"></i>As senhas não coincidem.
                                </p>
                            </div>
                            <div class="pt-2">
                                <Button type="submit" :disabled="siengeLoading || !canSubmitSienge">
                                    <i class="fas fa-floppy-disk mr-2 text-xs"></i>
                                    {{ siengeLoading ? 'Salvando...' : (siengeStatus?.hasCredentials ? 'Atualizar credenciais' : 'Salvar credenciais') }}
                                </Button>
                            </div>
                        </form>
                    </div>
                </transition>
            </div>

        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, reactive } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useMicrosoftStore } from '@/stores/Microsoft/microsoftStore';
import { updateMeInfo, changePassword } from '@/utils/Auth/apiAuth';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import UiSelect from '@/components/UI/Select.vue';
import Favorite from '@/components/config/Favorite.vue';
import FacialAuth from '@/views/Office/Settings/Account/components/FacialAuth.vue';
import { useToast } from 'vue-toastification';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import API_URL from '@/config/apiUrl';

// ─── Constants ────────────────────────────────────────────────────────────────
const PASSWORD_MIN_LENGTH = 8;
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /[0-9]/;
const SPECIAL_REGEX = /[!@#$%^&*()_\-+=[\]{};:,.?/\\|~`"'<>]/;
const ALLOWED_REGEX = /^[A-Za-z0-9!@#$%^&*()_\-+=[\]{};:,.?/\\|~`"'<>]+$/;

const passwordCheckList = [
    { key: 'minLength', label: `${PASSWORD_MIN_LENGTH}+ caracteres` },
    { key: 'uppercase', label: '1 maiúscula' },
    { key: 'lowercase', label: '1 minúscula' },
    { key: 'number', label: '1 número' },
    { key: 'special', label: '1 caractere especial' },
    { key: 'noInvalidChars', label: 'Apenas chars válidos' },
];

// ─── Setup ────────────────────────────────────────────────────────────────────
const toast = useToast();
const authStore = useAuthStore();
const microsoftStore = useMicrosoftStore();

// ─── Role helpers ─────────────────────────────────────────────────────────────
const isAdmin = computed(() => authStore.user?.role === 'admin')

// ─── Positions (select) ───────────────────────────────────────────────────────
const positionsOptions = ref([]);
const positionDescMap  = ref({});
const selectedPositionDesc = computed(() =>
    editableUser.value.position ? positionDescMap.value[editableUser.value.position] || '' : ''
);

async function loadPositions() {
    try {
        const res  = await fetch(`${API_URL}/admin/positions`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.data || []);
        const active = list.filter(p => p?.active && p?.is_internal);
        positionsOptions.value = active
            .map(p => ({ label: p.name, value: p.name }))
            .sort((a, b) => a.label.localeCompare(b.label));
        positionDescMap.value = Object.fromEntries(active.map(p => [p.name, p.description || '']));
    } catch { /* silencioso */ }
}

// ─── Profile state ────────────────────────────────────────────────────────────
const editableUser = ref({ username: '', email: '', phone: '', city: '', position: '', birth_date: '', status: false, face_enabled: false });
const originalUser = ref({});
const isDisabled = ref(true);
const profileLoading = ref(false);

// ─── Password state ───────────────────────────────────────────────────────────
const passwordSectionOpen = ref(false);
const passwordLoading = ref(false);
const passwordForm = reactive({ current: '', new: '', confirm: '' });
const showPasswords = reactive({ current: false, new: false, confirm: false });
const passwordSuccessBanner = ref({ visible: false, password: '', copied: false });
let passwordSuccessTimer = null;

// ─── Computed: new password checks ────────────────────────────────────────────
const newPasswordChecks = computed(() => {
    const p = passwordForm.new;
    const c = passwordForm.confirm;
    return {
        minLength: p.length >= PASSWORD_MIN_LENGTH,
        uppercase: UPPERCASE_REGEX.test(p),
        lowercase: LOWERCASE_REGEX.test(p),
        number: NUMBER_REGEX.test(p),
        special: SPECIAL_REGEX.test(p),
        noInvalidChars: p.length > 0 ? ALLOWED_REGEX.test(p) : true,
        match: p.length > 0 && c.length > 0 && p === c,
    };
});

const strengthScore = computed(() => {
    const c = newPasswordChecks.value;
    return [c.minLength, c.uppercase, c.lowercase, c.number, c.special].filter(Boolean).length;
});

function strengthBarColor(n) {
    const score = strengthScore.value;
    if (score === 0) return 'bg-gray-200 dark:bg-gray-700';
    const level = Math.ceil((score / 5) * 4);
    const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
    return n <= level ? colors[level - 1] : 'bg-gray-200 dark:bg-gray-700';
}

const canSubmitPassword = computed(() => {
    const c = newPasswordChecks.value;
    return Boolean(
        passwordForm.current &&
        passwordForm.new &&
        passwordForm.confirm &&
        c.minLength && c.uppercase && c.lowercase && c.number && c.special && c.noInvalidChars && c.match
    );
});

// ─── Profile helpers ──────────────────────────────────────────────────────────
const fillEditableUser = () => {
    if (!authStore.user) return;
    const data = {
        username: authStore.user.username,
        email: authStore.user.email,
        phone: authStore.user.phone || '',
        city: authStore.user.city,
        position: authStore.user.position,
        birth_date: authStore.user.birth_date,
        status: authStore.user.status,
        face_enabled: authStore.user.face_enabled,
    };
    editableUser.value = { ...data };
    originalUser.value = { ...data };
};

const calculateDaysInSystem = () => {
    if (!authStore.user?.created_at) return 'N/A';
    const diff = Math.abs(new Date() - new Date(authStore.user.created_at));
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

watch(() => authStore.user, fillEditableUser);

// ─── Profile actions ──────────────────────────────────────────────────────────
const toggleDisabled = () => {
    isDisabled.value = !isDisabled.value;
};

const cancelEdit = () => {
    editableUser.value = { ...originalUser.value };
    isDisabled.value = true;
};

const updateUser = async () => {
    profileLoading.value = true;
    try {
        await updateMeInfo(
            editableUser.value.username,
            editableUser.value.email,
            editableUser.value.position,
            editableUser.value.city,
            editableUser.value.birth_date,
            editableUser.value.status,
            editableUser.value.face_enabled,
            editableUser.value.phone || null,
        );
        await authStore.fetchUserInfo();
        fillEditableUser();
        isDisabled.value = true;
        toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
        toast.error(error?.message || 'Erro ao atualizar informações.');
    } finally {
        profileLoading.value = false;
    }
};

// ─── Password actions ─────────────────────────────────────────────────────────
const togglePasswordSection = () => {
    passwordSectionOpen.value = !passwordSectionOpen.value;
    if (!passwordSectionOpen.value) resetPasswordForm();
    dismissPasswordBanner();
};

const resetPasswordForm = () => {
    passwordForm.current = '';
    passwordForm.new = '';
    passwordForm.confirm = '';
    showPasswords.current = false;
    showPasswords.new = false;
    showPasswords.confirm = false;
};

const handleChangePassword = async () => {
    if (!canSubmitPassword.value) return;
    passwordLoading.value = true;
    try {
        const newPwd = passwordForm.new;
        await changePassword(passwordForm.current, newPwd, passwordForm.confirm);
        resetPasswordForm();
        passwordSectionOpen.value = false;

        // Exibe painel temporário com a nova senha para copiar
        if (passwordSuccessTimer) clearTimeout(passwordSuccessTimer);
        passwordSuccessBanner.value = { visible: true, password: newPwd, copied: false };
        passwordSuccessTimer = setTimeout(() => {
            passwordSuccessBanner.value.visible = false;
        }, 30000);
    } catch (error) {
        toast.error(error?.message || 'Erro ao alterar senha.');
    } finally {
        passwordLoading.value = false;
    }
};

function copyChangedPassword() {
    navigator.clipboard.writeText(passwordSuccessBanner.value.password);
    passwordSuccessBanner.value.copied = true;
    setTimeout(() => { passwordSuccessBanner.value.copied = false; }, 2500);
}

function dismissPasswordBanner() {
    if (passwordSuccessTimer) clearTimeout(passwordSuccessTimer);
    passwordSuccessBanner.value.visible = false;
    passwordSuccessBanner.value.password = '';
}

// ─── Microsoft ────────────────────────────────────────────────────────────────
const microsoftSectionOpen = ref(false);

async function handleUnlink() {
    try {
        await microsoftStore.unlink();
        toast.success('Conta Microsoft desvinculada.');
    } catch (err) {
        toast.error(err?.message || 'Erro ao desvincular conta Microsoft.');
    }
}

// ─── Sienge Credentials ───────────────────────────────────────────────────────
const siengeSectionOpen = ref(false);
const siengeLoading = ref(false);
const siengeStatus = ref(null); // { hasCredentials, maskedEmail }
const siengeForm = reactive({ email: '', password: '', confirmPassword: '' });
const showSiengePassword = ref(false);

async function loadSiengeStatus() {
    try {
        siengeStatus.value = await requestWithAuth(`${API_URL}/auth/user/sienge-credentials`);
    } catch { /* silencioso */ }
}

function toggleSiengeSection() {
    siengeSectionOpen.value = !siengeSectionOpen.value;
    if (!siengeSectionOpen.value) {
        siengeForm.email = '';
        siengeForm.password = '';
        siengeForm.confirmPassword = '';
    }
}

const canSubmitSienge = computed(() =>
    siengeForm.email?.trim() &&
    siengeForm.password?.trim() &&
    siengeForm.password === siengeForm.confirmPassword
);

async function handleSaveSiengeCredentials() {
    if (!canSubmitSienge.value) return;
    siengeLoading.value = true;
    try {
        await requestWithAuth(`${API_URL}/auth/user/sienge-credentials`, {
            method: 'PUT',
            body: JSON.stringify({ email: siengeForm.email.trim(), password: siengeForm.password }),
        });
        await loadSiengeStatus();
        siengeSectionOpen.value = false;
        siengeForm.email = '';
        siengeForm.password = '';
        siengeForm.confirmPassword = '';
        toast.success('Credenciais Sienge salvas com segurança!');
    } catch (error) {
        toast.error(error?.message || 'Erro ao salvar credenciais Sienge.');
    } finally {
        siengeLoading.value = false;
    }
}

onMounted(async () => {
    if (!authStore.user) await authStore.fetchUserInfo();
    fillEditableUser();
    loadSiengeStatus();
    microsoftStore.fetchStatus();
    loadPositions();
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.expand-enter-active {
    transition: max-height 0.28s ease, opacity 0.2s ease;
    max-height: 600px;
}

.expand-leave-active {
    transition: max-height 0.22s ease, opacity 0.15s ease;
}

.expand-enter-from,
.expand-leave-to {
    max-height: 0;
    opacity: 0;
    overflow: hidden;
}
</style>