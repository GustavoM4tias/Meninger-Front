<template>
    <div class="chatbot relative">
        <!-- Overlay para fechar chat ao clicar fora -->
        <div v-if="open" class="fixed inset-0 z-20" @click="toggleChat"></div>

        <!-- Container principal: botão, chat ou colapsado -->
        <div :class="[
            'fixed shadow-md shadow-black/10 cursor-pointer z-30 transition-all duration-500 overflow-hidden',
            collapsed
                ? 'w-10 h-10 rounded-l-full bottom-6 right-0 my-5 bg-gray-200 dark:bg-gray-600'
                : open
                    ? 'w-[85%] sm:w-[22rem] h-[32rem] flex flex-col rounded-xl bottom-0 right-0 m-5 bg-gray-200 dark:bg-gray-600'
                    : 'w-16 h-16 rounded-full bottom-0 right-0 m-5 bg-gray-200 dark:bg-gray-600'
        ]" @click.stop="collapsed ? (collapsed = false) : (!open && toggleChat())">
            <!-- Ícone: central no botão, canto no chat, mesmo no colapsado -->
            <img src="/Mlogo.png" :class="[
                'transition-all duration-500 ease-in-out invert dark:invert-0',
                collapsed
                    ? 'absolute inset-0 m-auto w-6'
                    : open
                        ? 'absolute top-3 left-3 w-8'
                        : 'absolute inset-0 m-auto w-16 p-2.5 pt-[.9rem]'
            ]" alt="Mlogo" />

            <!-- Conteúdo do chat -->
            <div v-if="open && !collapsed" class="pt-12 px-4 z-30 relative h-[calc(100%-5rem)] drop-shadow" @click.stop>
                <i class="fas fa-xmark absolute right-4 top-4 text-xl" @click="toggleChat"></i>
                
                <div 
                    class="flex flex-col items-start gap-2.5 rounded-lg h-full py-3 px-2 mb-2 bg-white dark:bg-gray-500 overflow-auto">

                    <div class="flex flex-col gap-1 w-full max-w-[85%]">
                        <div class="flex items-center space-x-2 rtl:space-x-reverse">
                            <span class="text-sm font-semibold text-gray-900 dark:text-white">Eme</span>
                            <span class="text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-400">11:46</span>
                        </div>
                        <div
                            class="flex flex-col leading-1.5 p-3 border-gray-200 bg-gray-100 rounded-e-xl rounded-b-xl dark:bg-gray-600">
                            <p class="text-xs sm:text-sm font-normal text-gray-900 dark:text-white"> That's awesome. I
                                think our
                                users will really appreciate the improvements.</p>
                        </div>
                    </div>

                    <div class="flex flex-col gap-0.5 sm:gap-1 w-full max-w-[85%] ml-auto items-end">
                        <div class="flex items-center space-x-2 rtl:space-x-reverse">
                            <span class="text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-400">11:47</span>
                            <span class="text-sm font-semibold text-gray-900 dark:text-white">Você</span>
                        </div>
                        <div
                            class="flex flex-col leading-1.5 p-3 border-gray-200 bg-gray-100 rounded-s-xl rounded-b-xl  dark:bg-gray-400">
                            <p class="text-xs sm:text-sm font-normal text-gray-900 dark:text-white"> That's awesome. I
                                think our
                                users will really appreciate the improvements.</p>
                        </div>
                    </div>
                    <div class="flex flex-col gap-1 w-full max-w-[85%]">
                        <div class="flex items-center space-x-2 rtl:space-x-reverse">
                            <span class="text-sm font-semibold text-gray-900 dark:text-white">Eme</span>
                            <span class="text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-400">11:46</span>
                        </div>
                        <div
                            class="flex flex-col leading-1.5 p-3 border-gray-200 bg-gray-100 rounded-e-xl rounded-b-xl dark:bg-gray-600">
                            <p class="text-xs sm:text-sm font-normal text-gray-900 dark:text-white"> That's awesome. I
                                think our
                                users will really appreciate the improvements.</p>
                        </div>
                    </div>

                    <div class="flex flex-col gap-0.5 sm:gap-1 w-full max-w-[85%] ml-auto items-end">
                        <div class="flex items-center space-x-2 rtl:space-x-reverse">
                            <span class="text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-400">11:47</span>
                            <span class="text-sm font-semibold text-gray-900 dark:text-white">Você</span>
                        </div>
                        <div
                            class="flex flex-col leading-1.5 p-3 border-gray-200 bg-gray-100 rounded-s-xl rounded-b-xl  dark:bg-gray-400">
                            <p class="text-xs sm:text-sm font-normal text-gray-900 dark:text-white"> That's awesome. I
                                think our
                                users will really appreciate the improvements.</p>
                        </div>
                    </div> 
                </div>

                <form class="drop-shadow">
                    <label for="chat" class="sr-only">Your message</label>
                    <div class="flex items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
                        <!-- <button type="button"
                            class="inline-flex justify-center p-2 text-gray-500 rounded-lg cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600">
                            <i class="fas fa-paperclip text-2xl"></i>
                            <span class="sr-only">Upload</span>
                        </button> -->
                        <textarea id="chat" rows="1"
                            class="block me-2 p-2.5 w-full text-sm outline-none text-gray-900 bg-white rounded-lg border border-gray-300 focus:ring-gray-500 focus:border-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gray-500 dark:focus:border-gray-500"
                            placeholder="Your message..."></textarea>

                        <button type="button"
                            class="inline-flex justify-center p-2 text-gray-500 rounded-lg cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600">
                            <i class="fas fa-paper-plane text-2xl"></i>
                            <span class="sr-only">Send message</span>
                        </button>
                    </div>
                </form>

            </div>
        </div>

        <!-- Span de fechar chat: só quando está na caixa fechada (não colapsado nem aberto) -->
        <span v-if="!open && !collapsed" @click.stop="collapseChat"
            class="fixed w-20 right-3 bottom-1 text-gray-400 text-xs text-end cursor-pointer">
            Fechar chat? <i class="fas fa-xmark"></i>
        </span>
    </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';

const open = ref(false);
const collapsed = ref(false);
const chatContainer = ref(null)

const toggleChat = () => {
    open.value = !open.value;
};

const collapseChat = () => {
    open.value = false;
    collapsed.value = true;
};

function scrollToBottom() {
    nextTick(() => {
        const el = chatContainer.value
        el.scrollTop = el.scrollHeight
    })
}

</script>
